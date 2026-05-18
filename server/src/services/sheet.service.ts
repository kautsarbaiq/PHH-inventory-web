// ============================================================
// PHH Inventory — Sheet Service
// ============================================================

import { eq, desc, sql, and, ilike } from "drizzle-orm";
import { db } from "../db/index.js";
import { masterSheets } from "../db/schema/sheets.js";
import { cuttingOrders } from "../db/schema/cuttings.js";
import type { SheetWithStats, SheetStatus } from "@phh/shared";

export class SheetService {
  /**
   * Create a new master sheet (Goods Receipt).
   */
  async createSheet(
    data: {
      sheetNumber: string;
      grade: string;
      supplier: string;
      length: number;
      width: number;
      thickness: number;
      kerfAllowance?: number;
      notes?: string;
    },
    userId: string
  ) {
    const totalArea = data.length * data.width;

    const [sheet] = await db
      .insert(masterSheets)
      .values({
        sheetNumber: data.sheetNumber,
        grade: data.grade,
        supplier: data.supplier,
        length: data.length,
        width: data.width,
        thickness: data.thickness,
        totalArea,
        kerfAllowance: data.kerfAllowance ?? 2,
        notes: data.notes ?? null,
        createdBy: userId,
      })
      .returning();

    return sheet;
  }

  /**
   * Get a sheet by ID with computed stats and cutting count.
   */
  async getSheetById(id: string): Promise<SheetWithStats | null> {
    const sheet = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, id),
    });

    if (!sheet) return null;

    // Count cuttings
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cuttingOrders)
      .where(eq(cuttingOrders.sheetId, id));

    const availableArea = sheet.totalArea - sheet.usedArea - sheet.scrapArea;
    const usedPercentage =
      sheet.totalArea > 0 ? (sheet.usedArea / sheet.totalArea) * 100 : 0;

    return {
      ...sheet,
      status: sheet.status as SheetStatus,
      availableArea: Math.max(0, availableArea),
      usedPercentage: Math.round(usedPercentage * 100) / 100,
      availablePercentage: Math.round((100 - usedPercentage) * 100) / 100,
      cuttingCount: countResult?.count ?? 0,
    };
  }

  /**
   * List sheets with optional search and pagination.
   */
  async listSheets(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.status) {
      conditions.push(eq(masterSheets.status, params.status));
    }
    if (params.search) {
      conditions.push(ilike(masterSheets.sheetNumber, `%${params.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [sheets, [countResult]] = await Promise.all([
      db
        .select()
        .from(masterSheets)
        .where(whereClause)
        .orderBy(desc(masterSheets.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(masterSheets)
        .where(whereClause),
    ]);

    return {
      data: sheets,
      pagination: {
        page,
        limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      },
    };
  }

  /**
   * Update sheet info (grade, supplier, notes, status, scrapArea).
   */
  async updateSheet(
    id: string,
    data: {
      grade?: string;
      supplier?: string;
      notes?: string;
      status?: string;
      scrapArea?: number;
    }
  ) {
    const [updated] = await db
      .update(masterSheets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(masterSheets.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Archive a sheet (soft delete).
   */
  async archiveSheet(id: string) {
    await db
      .update(masterSheets)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(masterSheets.id, id));
  }

  /**
   * Recalculate the usedArea from all cutting orders.
   * Called after creating or deleting a cutting.
   */
  async recalculateUsedArea(sheetId: string) {
    const [result] = await db
      .select({
        totalEffectiveArea: sql<number>`COALESCE(SUM(${cuttingOrders.effectiveArea}), 0)`,
      })
      .from(cuttingOrders)
      .where(eq(cuttingOrders.sheetId, sheetId));

    await db
      .update(masterSheets)
      .set({
        usedArea: result?.totalEffectiveArea ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(masterSheets.id, sheetId));
  }
}

export const sheetService = new SheetService();
