// ============================================================
// PHH Inventory — Sheet Service
// ============================================================

import { eq, ne, desc, sql, and, ilike, gte, isNull, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { masterSheets } from "../db/schema/sheets.js";
import { cuttingOrders } from "../db/schema/cuttings.js";
import type { SheetWithStats, SheetStatus, GenealogyNode } from "@phh/shared";

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
      density: number;
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
        density: data.density,
        totalArea,
        kerfAllowance: data.kerfAllowance ?? 2,
        notes: data.notes ?? null,
        createdBy: userId,
      })
      .returning();

    return sheet;
  }

  /**
   * Create a Son Sheet from remaining material of a parent sheet.
   */
  async createSonSheet(
    parentId: string,
    data: {
      sheetNumber: string;
      length: number;
      width: number;
      thickness: number;
      grade?: string;
      supplier?: string;
      kerfAllowance?: number;
      notes?: string;
      shape?: string;
      dimensions?: any;
    },
    userId: string
  ) {
    // Get parent sheet
    const parent = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, parentId),
    });

    if (!parent) {
      throw new Error("Parent sheet not found");
    }

    const totalArea = data.length * data.width;

    const [sonSheet] = await db
      .insert(masterSheets)
      .values({
        sheetNumber: data.sheetNumber,
        grade: data.grade || parent.grade,
        supplier: data.supplier || parent.supplier,
        length: data.length,
        width: data.width,
        thickness: data.thickness,
        density: parent.density,
        shape: data.shape || "rectangle",
        dimensions: data.dimensions || null,
        totalArea,
        kerfAllowance: data.kerfAllowance ?? parent.kerfAllowance,
        notes: data.notes ?? `Son of ${parent.sheetNumber}`,
        parentId: parentId,
        createdBy: userId,
      })
      .returning();

    return sonSheet;
  }

  /**
   * Create a Son Sheet directly from a cutting order (inherits shape and dimensions)
   */
  async createSonFromCutting(sheetId: string, cuttingId: string, userId: string, customName?: string) {
    const parent = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId),
    });
    if (!parent) throw new Error("Parent sheet not found");

    const cutting = await db.query.cuttingOrders.findFirst({
      where: eq(cuttingOrders.id, cuttingId),
    });
    if (!cutting) throw new Error("Cutting order not found");
    if (cutting.sheetId !== sheetId) throw new Error("Cutting order does not belong to this sheet");

    // Calculate dimensions based on shape
    let length = 0;
    let width = 0;
    const dims: any = cutting.dimensions || {};
    
    if (cutting.cuttingType === "rectangle") {
      length = Number(dims.length) || 0;
      width = Number(dims.width) || 0;
    } else if (cutting.cuttingType === "circle") {
      const r = Number(dims.radius) || 0;
      length = r * 2;
      width = r * 2;
    } else if (cutting.cuttingType === "triangle") {
      length = Number(dims.base) || 0;
      width = Number(dims.height) || 0;
    }

    const totalArea = cutting.cutArea; // Inherit area from cutting order exactly

    const finalSheetNumber = customName ? customName.trim() : `${cutting.jobNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;

    const [sonSheet] = await db
      .insert(masterSheets)
      .values({
        sheetNumber: finalSheetNumber,
        grade: parent.grade,
        supplier: parent.supplier,
        length,
        width,
        thickness: parent.thickness,
        density: parent.density,
        totalArea,
        kerfAllowance: parent.kerfAllowance,
        notes: `Son from cutting job ${cutting.jobNumber}`,
        shape: cutting.cuttingType,
        dimensions: cutting.dimensions,
        parentId: parent.id,
        createdBy: userId,
      })
      .returning();

    return sonSheet;
  }

  /**
   * Get genealogy tree for a sheet (finds root, then builds tree downward).
   */
  async getGenealogy(sheetId: string): Promise<GenealogyNode | null> {
    // 1. Find the root (walk up to the top mother)
    let currentId = sheetId;
    let rootSheet: any = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, currentId),
    });

    if (!rootSheet) return null;

    while (rootSheet && rootSheet.parentId) {
      const parent: any = await db.query.masterSheets.findFirst({
        where: eq(masterSheets.id, rootSheet.parentId),
      });
      if (!parent) break;
      rootSheet = parent;
    }

    // 2. Build tree recursively from root
    return this.buildGenealogyNode(rootSheet.id);
  }

  private async buildGenealogyNode(sheetId: string): Promise<GenealogyNode | null> {
    const sheet = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId),
    });

    if (!sheet) return null;

    // Find children
    const children = await db
      .select()
      .from(masterSheets)
      .where(eq(masterSheets.parentId, sheetId))
      .orderBy(masterSheets.createdAt);

    const childNodes: GenealogyNode[] = [];
    for (const child of children) {
      const node = await this.buildGenealogyNode(child.id);
      if (node) childNodes.push(node);
    }

    return {
      id: sheet.id,
      sheetNumber: sheet.sheetNumber,
      grade: sheet.grade,
      supplier: sheet.supplier,
      density: sheet.density,
      length: sheet.length,
      width: sheet.width,
      thickness: sheet.thickness,
      totalArea: sheet.totalArea,
      usedArea: sheet.usedArea,
      scrapArea: sheet.scrapArea,
      status: sheet.status as SheetStatus,
      parentId: sheet.parentId,
      children: childNodes,
    };
  }

  /**
   * Get genealogy trees for multiple sheets (batch).
   * Deduplicates by finding unique roots, so if both a parent and child are in the list,
   * only one tree is returned.
   */
  async getGenealogyBatch(sheetIds: string[]): Promise<GenealogyNode[]> {
    const rootIds = new Set<string>();
    const trees: GenealogyNode[] = [];

    for (const sheetId of sheetIds) {
      // Walk up to find root
      let current: any = await db.query.masterSheets.findFirst({
        where: eq(masterSheets.id, sheetId),
      });
      if (!current) continue;

      while (current && current.parentId) {
        const parent: any = await db.query.masterSheets.findFirst({
          where: eq(masterSheets.id, current.parentId),
        });
        if (!parent) break;
        current = parent;
      }

      // Deduplicate by root ID
      if (!rootIds.has(current.id)) {
        rootIds.add(current.id);
        const tree = await this.buildGenealogyNode(current.id);
        if (tree) trees.push(tree);
      }
    }

    return trees;
  }

  /**
   * Get a sheet by ID with computed stats and cutting count.
   */
  async getSheetById(id: string): Promise<SheetWithStats | null> {
    // Update lastOpenedAt on every fetch/detail view
    await db
      .update(masterSheets)
      .set({ lastOpenedAt: new Date() })
      .where(eq(masterSheets.id, id));

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
      parentId: sheet.parentId,
      availableArea: Math.max(0, availableArea),
      usedPercentage: Math.round(usedPercentage * 100) / 100,
      availablePercentage: Math.round((100 - usedPercentage) * 100) / 100,
      cuttingCount: countResult?.count ?? 0,
    };
  }

  /**
   * Helper to recursively load all descendants of a sheet.
   */
  private async loadDescendants(sheet: any): Promise<any> {
    const children = await db
      .select()
      .from(masterSheets)
      .where(eq(masterSheets.parentId, sheet.id))
      .orderBy(masterSheets.createdAt);

    const childrenWithDescendants = [];
    for (const child of children) {
      const childWithDescendants = await this.loadDescendants(child);
      childrenWithDescendants.push(childWithDescendants);
    }

    return {
      ...sheet,
      children: childrenWithDescendants,
    };
  }

  /**
   * List sheets with optional search, filter, and pagination.
   */
  async listSheets(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    excludeStatus?: string;
    thickness?: number;
    minLength?: number;
    minWidth?: number;
    isRootOnly?: boolean;
    parentId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    // ---- SPECIAL HANDLER FOR SEARCH (HIERARCHICAL RESOLUTION) ----
    if (params.search) {
      const conditions = [ilike(masterSheets.sheetNumber, `%${params.search}%`)];
      if (params.status) {
        conditions.push(eq(masterSheets.status, params.status));
      }
      if (params.excludeStatus) {
        conditions.push(ne(masterSheets.status, params.excludeStatus));
      }
      if (params.thickness !== undefined && params.thickness > 0) {
        conditions.push(eq(masterSheets.thickness, params.thickness));
      }
      if (params.minLength !== undefined && params.minLength > 0) {
        conditions.push(gte(masterSheets.length, params.minLength));
      }
      if (params.minWidth !== undefined && params.minWidth > 0) {
        conditions.push(gte(masterSheets.width, params.minWidth));
      }

      // 1. Find all matching sheets (root or son) matching the search and filters
      const matchingSheets = await db
        .select()
        .from(masterSheets)
        .where(and(...conditions));

      const matchingIds = matchingSheets.map((s) => s.id);

      if (matchingSheets.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
          matchingSheetIds: [],
        };
      }

      // 2. Walk up to resolve the absolute root parent of each match
      const rootIdsSet = new Set<string>();
      for (const sheet of matchingSheets) {
        let current = sheet;
        while (current.parentId) {
          const parent = await db.query.masterSheets.findFirst({
            where: eq(masterSheets.id, current.parentId),
          });
          if (!parent) break;
          current = parent;
        }
        rootIdsSet.add(current.id);
      }

      const rootIds = Array.from(rootIdsSet);

      // 3. Query fully-detailed root sheets
      const roots = await db
        .select()
        .from(masterSheets)
        .where(inArray(masterSheets.id, rootIds))
        .orderBy(sql`${masterSheets.lastOpenedAt} DESC NULLS LAST, ${masterSheets.createdAt} DESC`);

      // Apply in-memory pagination
      const total = roots.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedRoots = roots.slice(offset, offset + limit);

      // 4. Pre-load all descendants for matching roots recursively
      const paginatedRootsWithDescendants = [];
      for (const root of paginatedRoots) {
        const rootWithDescendants = await this.loadDescendants(root);
        paginatedRootsWithDescendants.push(rootWithDescendants);
      }

      return {
        data: paginatedRootsWithDescendants,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        matchingSheetIds: matchingIds,
      };
    }

    // ---- REGULAR BROWSING (DEFAULT FAST PATH) ----
    const conditions = [];
    if (params.status) {
      conditions.push(eq(masterSheets.status, params.status));
    }
    if (params.excludeStatus) {
      conditions.push(ne(masterSheets.status, params.excludeStatus));
    }
    if (params.thickness !== undefined && params.thickness > 0) {
      conditions.push(eq(masterSheets.thickness, params.thickness));
    }
    if (params.minLength !== undefined && params.minLength > 0) {
      conditions.push(gte(masterSheets.length, params.minLength));
    }
    if (params.minWidth !== undefined && params.minWidth > 0) {
      conditions.push(gte(masterSheets.width, params.minWidth));
    }
    if (params.isRootOnly) {
      conditions.push(isNull(masterSheets.parentId));
    }
    if (params.parentId) {
      conditions.push(eq(masterSheets.parentId, params.parentId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [sheets, [countResult]] = await Promise.all([
      db
        .select()
        .from(masterSheets)
        .where(whereClause)
        .orderBy(sql`${masterSheets.lastOpenedAt} DESC NULLS LAST, ${masterSheets.createdAt} DESC`)
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
      matchingSheetIds: [],
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
      usedArea?: number;
      isManualUsage?: boolean;
      length?: number;
      width?: number;
      thickness?: number;
      density?: number;
      kerfAllowance?: number;
    }
  ) {
    const updateData: any = { ...data };

    if (data.length !== undefined || data.width !== undefined) {
      const currentSheet = await db.query.masterSheets.findFirst({
        where: eq(masterSheets.id, id),
      });
      if (currentSheet) {
        const newLength = data.length ?? currentSheet.length;
        const newWidth = data.width ?? currentSheet.width;
        updateData.totalArea = newLength * newWidth;
      }
    }

    const [updated] = await db
      .update(masterSheets)
      .set({
        ...updateData,
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
   */
  async recalculateUsedArea(sheetId: string) {
    const sheet = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId),
    });

    if (!sheet || sheet.isManualUsage) {
      return;
    }

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

  /**
   * Permanently delete a sheet and all its related cuttings.
   */
  async deleteSheetPermanently(id: string) {
    // explicitly delete cuttings first just to be safe if no CASCADE
    await db.delete(cuttingOrders).where(eq(cuttingOrders.sheetId, id));
    await db.delete(masterSheets).where(eq(masterSheets.id, id));
  }
}

export const sheetService = new SheetService();
