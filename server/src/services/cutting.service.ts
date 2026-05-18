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
import type { CuttingDimensions, ValidationResult } from "@phh/shared";

export class CuttingService {
  /**
   * Create a cutting order with collision validation.
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
    // 1. Get the sheet
    const sheet = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId),
    });

    if (!sheet) {
      throw new Error("Sheet not found");
    }

    if (sheet.status !== "active") {
      throw new Error("Sheet is not active — cannot add cuttings");
    }

    // 2. Get existing cuttings for collision check
    const existingCuttings = await db
      .select()
      .from(cuttingOrders)
      .where(eq(cuttingOrders.sheetId, sheetId));

    // 3. Validate placement (collision detection)
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

    // 4. Calculate areas
    const cutArea = calculateCutArea(data.cuttingType, data.dimensions);
    const effectiveArea = calculateEffectiveArea(
      data.cuttingType,
      data.dimensions,
      sheet.kerfAllowance
    );

    // 5. Insert the cutting order
    const [cutting] = await db
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

    // 6. Recalculate the sheet's used area
    await sheetService.recalculateUsedArea(sheetId);

    return cutting;
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
    // 1. Get the cutting being moved
    const [targetCutting] = await db
      .select()
      .from(cuttingOrders)
      .where(and(eq(cuttingOrders.id, id), eq(cuttingOrders.sheetId, sheetId)));

    if (!targetCutting) {
      throw new Error("Cutting not found");
    }

    // 2. Get the sheet
    const sheet = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId),
    });

    if (!sheet) throw new Error("Sheet not found");

    // 3. Get other cuttings (exclude self)
    const otherCuttings = await db
      .select()
      .from(cuttingOrders)
      .where(
        and(
          eq(cuttingOrders.sheetId, sheetId),
          // We'll filter out the target in JS
        )
      );

    const filtered = otherCuttings.filter((c) => c.id !== id);

    // 4. Validate new position
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

    // 5. Update
    const [updated] = await db
      .update(cuttingOrders)
      .set({
        positionX: position.positionX,
        positionY: position.positionY,
        rotation: position.rotation ?? targetCutting.rotation,
      })
      .where(eq(cuttingOrders.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a cutting order and recalculate sheet usage.
   */
  async deleteCutting(id: string, sheetId: string) {
    await db
      .delete(cuttingOrders)
      .where(and(eq(cuttingOrders.id, id), eq(cuttingOrders.sheetId, sheetId)));

    // Recalculate used area
    await sheetService.recalculateUsedArea(sheetId);
  }
}

export const cuttingService = new CuttingService();
