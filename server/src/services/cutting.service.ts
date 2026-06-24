// ============================================================
// PHH Inventory — Cutting Service
// ============================================================

import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { cuttingOrders } from "../db/schema/cuttings.js";
import { masterSheets } from "../db/schema/sheets.js";
import { calculateCutArea, calculateEffectiveArea } from "../utils/area-calculator.js";
import { validatePlacement } from "../utils/collision.js";
import { sheetService } from "./sheet.service.js";
import type { CuttingDimensions } from "@phh/shared";

/** Whether a dimensions object structurally matches a cutting type. */
function dimensionsMatchType(type: string, dims: any): boolean {
  if (!dims || typeof dims !== "object") return false;
  if (type === "rectangle") return "length" in dims && "width" in dims;
  if (type === "circle") return "radius" in dims;
  if (type === "triangle") return "base" in dims && "height" in dims;
  return false;
}

export class CuttingService {
  /**
   * Create a cutting order with collision validation.
   * Runs inside a transaction that locks the sheet row (FOR UPDATE) so two
   * concurrent placements on the same sheet cannot both pass collision and
   * then overlap (TOCTOU), and so the usedArea recalculation is atomic.
   */
  async createCutting(
    sheetId: string,
    data: {
      jobNumber: string;
      cuttingType: string;
      dimensions: CuttingDimensions;
      positionX: number;
      positionY: number;
      rotation?: number;
      notes?: string;
    },
    userId: string
  ) {
    return db.transaction(async (tx) => {
      // 1. Lock the sheet row to serialize concurrent writers.
      const [sheet] = await tx
        .select()
        .from(masterSheets)
        .where(eq(masterSheets.id, sheetId))
        .for("update");

      if (!sheet) {
        throw new Error("Sheet not found");
      }
      if (sheet.status !== "active") {
        throw new Error("Sheet is not active — cannot add cuttings");
      }

      // 2. Existing cuttings for collision check (within the locked tx).
      const existingCuttings = await tx
        .select()
        .from(cuttingOrders)
        .where(eq(cuttingOrders.sheetId, sheetId));

      // 3. Validate placement (collision detection).
      const validation = validatePlacement(
        sheet.length,
        sheet.width,
        sheet.kerfAllowance,
        existingCuttings.map((c) => ({
          cuttingType: c.cuttingType,
          dimensions: c.dimensions as CuttingDimensions,
          positionX: c.positionX,
          positionY: c.positionY,
          rotation: c.rotation,
        })),
        {
          cuttingType: data.cuttingType,
          dimensions: data.dimensions,
          positionX: data.positionX,
          positionY: data.positionY,
          rotation: data.rotation ?? 0,
        }
      );

      if (!validation.valid) {
        throw new Error(`Placement invalid: ${validation.errors.join("; ")}`);
      }

      // 4. Calculate areas.
      const cutArea = calculateCutArea(data.cuttingType, data.dimensions);
      const effectiveArea = calculateEffectiveArea(
        data.cuttingType,
        data.dimensions,
        sheet.kerfAllowance
      );

      // 5. Insert the cutting order.
      const [cutting] = await tx
        .insert(cuttingOrders)
        .values({
          sheetId,
          jobNumber: data.jobNumber,
          cuttingType: data.cuttingType,
          dimensions: data.dimensions,
          cutArea,
          effectiveArea,
          positionX: data.positionX,
          positionY: data.positionY,
          rotation: data.rotation ?? 0,
          notes: data.notes ?? null,
          createdBy: userId,
        })
        .returning();

      // 6. Recalculate usedArea (forceAuto: adding a cut resumes auto tracking).
      await sheetService.recalculateUsedArea(sheetId, tx, true);

      return cutting;
    });
  }

  /**
   * Get all cuttings for a sheet.
   */
  async getCuttingsBySheet(sheetId: string) {
    return db
      .select()
      .from(cuttingOrders)
      .where(eq(cuttingOrders.sheetId, sheetId))
      .orderBy(cuttingOrders.createdAt);
  }

  /**
   * Update cutting position (after drag-and-drop).
   */
  async updateCuttingPosition(
    id: string,
    sheetId: string,
    position: { positionX: number; positionY: number; rotation?: number }
  ) {
    return db.transaction(async (tx) => {
      const [sheet] = await tx
        .select()
        .from(masterSheets)
        .where(eq(masterSheets.id, sheetId))
        .for("update");
      if (!sheet) throw new Error("Sheet not found");

      const [targetCutting] = await tx
        .select()
        .from(cuttingOrders)
        .where(and(eq(cuttingOrders.id, id), eq(cuttingOrders.sheetId, sheetId)));
      if (!targetCutting) throw new Error("Cutting not found");

      const others = await tx
        .select()
        .from(cuttingOrders)
        .where(eq(cuttingOrders.sheetId, sheetId));
      const filtered = others.filter((c) => c.id !== id);

      const validation = validatePlacement(
        sheet.length,
        sheet.width,
        sheet.kerfAllowance,
        filtered.map((c) => ({
          cuttingType: c.cuttingType,
          dimensions: c.dimensions as CuttingDimensions,
          positionX: c.positionX,
          positionY: c.positionY,
          rotation: c.rotation,
        })),
        {
          cuttingType: targetCutting.cuttingType,
          dimensions: targetCutting.dimensions as CuttingDimensions,
          positionX: position.positionX,
          positionY: position.positionY,
          rotation: position.rotation ?? targetCutting.rotation,
        }
      );

      if (!validation.valid) {
        throw new Error(`Invalid position: ${validation.errors.join("; ")}`);
      }

      const [updated] = await tx
        .update(cuttingOrders)
        .set({
          positionX: position.positionX,
          positionY: position.positionY,
          rotation: position.rotation ?? targetCutting.rotation,
        })
        .where(eq(cuttingOrders.id, id))
        .returning();

      return updated;
    });
  }

  /**
   * Update cutting order details (jobNumber, dimensions, notes) with collision validation.
   */
  async updateCutting(
    id: string,
    sheetId: string,
    data: {
      jobNumber?: string;
      dimensions?: CuttingDimensions;
      notes?: string;
    }
  ) {
    return db.transaction(async (tx) => {
      const [sheet] = await tx
        .select()
        .from(masterSheets)
        .where(eq(masterSheets.id, sheetId))
        .for("update");
      if (!sheet) throw new Error("Sheet not found");

      const [targetCutting] = await tx
        .select()
        .from(cuttingOrders)
        .where(and(eq(cuttingOrders.id, id), eq(cuttingOrders.sheetId, sheetId)));
      if (!targetCutting) throw new Error("Cutting not found");

      const updatedJobNumber = data.jobNumber ?? targetCutting.jobNumber;
      const updatedNotes = data.notes !== undefined ? data.notes : targetCutting.notes;
      const updatedDimensions = data.dimensions ?? (targetCutting.dimensions as CuttingDimensions);

      let cutArea = targetCutting.cutArea;
      let effectiveArea = targetCutting.effectiveArea;

      if (data.dimensions) {
        // Reject dimensions that don't match the cut's shape (prevents NaN areas).
        if (!dimensionsMatchType(targetCutting.cuttingType, data.dimensions)) {
          throw new Error("Dimensions do not match cutting type");
        }

        const others = await tx
          .select()
          .from(cuttingOrders)
          .where(eq(cuttingOrders.sheetId, sheetId));
        const filtered = others.filter((c) => c.id !== id);

        const validation = validatePlacement(
          sheet.length,
          sheet.width,
          sheet.kerfAllowance,
          filtered.map((c) => ({
            cuttingType: c.cuttingType,
            dimensions: c.dimensions as CuttingDimensions,
            positionX: c.positionX,
            positionY: c.positionY,
            rotation: c.rotation,
          })),
          {
            cuttingType: targetCutting.cuttingType,
            dimensions: updatedDimensions,
            positionX: targetCutting.positionX,
            positionY: targetCutting.positionY,
            rotation: targetCutting.rotation,
          }
        );

        if (!validation.valid) {
          throw new Error(`Placement invalid: ${validation.errors.join("; ")}`);
        }

        cutArea = calculateCutArea(targetCutting.cuttingType, updatedDimensions);
        effectiveArea = calculateEffectiveArea(
          targetCutting.cuttingType,
          updatedDimensions,
          sheet.kerfAllowance
        );
      }

      const [updated] = await tx
        .update(cuttingOrders)
        .set({
          jobNumber: updatedJobNumber,
          notes: updatedNotes,
          dimensions: updatedDimensions,
          cutArea,
          effectiveArea,
        })
        .where(eq(cuttingOrders.id, id))
        .returning();

      // Recompute usedArea only when the area actually changed.
      if (data.dimensions) {
        await sheetService.recalculateUsedArea(sheetId, tx, true);
      }

      return updated;
    });
  }

  /**
   * Delete a cutting order and recalculate sheet usage (atomic).
   */
  async deleteCutting(id: string, sheetId: string) {
    return db.transaction(async (tx) => {
      await tx
        .select()
        .from(masterSheets)
        .where(eq(masterSheets.id, sheetId))
        .for("update");

      await tx
        .delete(cuttingOrders)
        .where(and(eq(cuttingOrders.id, id), eq(cuttingOrders.sheetId, sheetId)));

      // Removing a cut resumes auto tracking.
      await sheetService.recalculateUsedArea(sheetId, tx, true);
    });
  }
}

export const cuttingService = new CuttingService();
