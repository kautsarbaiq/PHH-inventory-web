// ============================================================
// PHH Inventory — Sheet Service
// ============================================================

import { eq, ne, desc, sql, and, ilike, gte, isNull, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { masterSheets } from "../db/schema/sheets.js";
import { cuttingOrders } from "../db/schema/cuttings.js";
import type { SheetWithStats, SheetStatus, GenealogyNode } from "@phh/shared";

// Anything with a Drizzle query/select interface (db or a transaction handle).
// Typed loosely because the top-level db and a tx handle have distinct,
// deeply-generic types that are awkward to unify.
type Executor = any;

export class SheetService {
  /**
   * Derive a sheet's lifecycle status from its area accounting.
   * Never overrides an explicit "archived" state.
   */
  private deriveStatus(
    usedArea: number,
    scrapArea: number,
    totalArea: number,
    currentStatus: string
  ): string {
    if (currentStatus === "archived") return "archived";
    return totalArea > 0 && usedArea + scrapArea >= totalArea ? "depleted" : "active";
  }

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

    // Area conservation: a son cut from the parent cannot be physically
    // larger than the parent in either dimension.
    if (data.length > parent.length || data.width > parent.width) {
      throw new Error("Son sheet dimensions cannot exceed the parent sheet");
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

    const trimmedName = customName?.trim();
    const finalSheetNumber =
      trimmedName && trimmedName.length > 0
        ? trimmedName
        : `${cutting.jobNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;

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
    const rootSheet = await this.findRoot(sheetId);
    if (!rootSheet) return null;
    return this.buildGenealogyNode(rootSheet.id, new Set<string>());
  }

  /**
   * Walk up parentId to the absolute root, with cycle protection.
   */
  private async findRoot(sheetId: string): Promise<any | null> {
    const visited = new Set<string>();
    let current: any = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId),
    });
    if (!current) return null;

    while (current && current.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      const parent: any = await db.query.masterSheets.findFirst({
        where: eq(masterSheets.id, current.parentId),
      });
      if (!parent || visited.has(parent.id)) break;
      current = parent;
    }
    return current;
  }

  private async buildGenealogyNode(
    sheetId: string,
    visited: Set<string>
  ): Promise<GenealogyNode | null> {
    if (visited.has(sheetId)) return null; // cycle guard
    visited.add(sheetId);

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
      const node = await this.buildGenealogyNode(child.id, visited);
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
   * Deduplicates by finding unique roots.
   */
  async getGenealogyBatch(sheetIds: string[]): Promise<GenealogyNode[]> {
    const rootIds = new Set<string>();
    const trees: GenealogyNode[] = [];

    for (const sheetId of sheetIds) {
      const root = await this.findRoot(sheetId);
      if (!root) continue;

      if (!rootIds.has(root.id)) {
        rootIds.add(root.id);
        const tree = await this.buildGenealogyNode(root.id, new Set<string>());
        if (tree) trees.push(tree);
      }
    }

    return trees;
  }

  /**
   * Get a sheet by ID with computed stats and cutting count.
   */
  async getSheetById(id: string): Promise<SheetWithStats | null> {
    const sheet = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, id),
    });

    if (!sheet) return null;

    // Fire-and-forget recency update so the read endpoint stays fast and
    // does not block on a write (and read replicas stay usable).
    db
      .update(masterSheets)
      .set({ lastOpenedAt: new Date() })
      .where(eq(masterSheets.id, id))
      .execute()
      .catch((e) => console.error("lastOpenedAt update failed:", e));

    // Count cuttings
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cuttingOrders)
      .where(eq(cuttingOrders.sheetId, id));

    const availableArea = Math.max(0, sheet.totalArea - sheet.usedArea - sheet.scrapArea);
    const usedPercentage = sheet.totalArea > 0 ? (sheet.usedArea / sheet.totalArea) * 100 : 0;
    const availablePercentage = sheet.totalArea > 0 ? (availableArea / sheet.totalArea) * 100 : 0;

    return {
      ...sheet,
      status: sheet.status as SheetStatus,
      parentId: sheet.parentId,
      availableArea,
      usedPercentage: Math.round(usedPercentage * 100) / 100,
      availablePercentage: Math.round(availablePercentage * 100) / 100,
      cuttingCount: countResult?.count ?? 0,
    };
  }

  /**
   * Helper to recursively load all descendants of a sheet (cycle-safe).
   */
  private async loadDescendants(sheet: any, visited: Set<string>): Promise<any> {
    if (visited.has(sheet.id)) return { ...sheet, children: [] };
    visited.add(sheet.id);

    const children = await db
      .select()
      .from(masterSheets)
      .where(eq(masterSheets.parentId, sheet.id))
      .orderBy(masterSheets.createdAt);

    const childrenWithDescendants = [];
    for (const child of children) {
      childrenWithDescendants.push(await this.loadDescendants(child, visited));
    }

    return { ...sheet, children: childrenWithDescendants };
  }

  // ---- cuttingCount enrichment helpers ------------------------------

  private collectIds(nodes: any[], acc: string[] = []): string[] {
    for (const n of nodes) {
      acc.push(n.id);
      if (n.children?.length) this.collectIds(n.children, acc);
    }
    return acc;
  }

  private assignCounts(nodes: any[], counts: Map<string, number>) {
    for (const n of nodes) {
      n.cuttingCount = counts.get(n.id) ?? 0;
      if (n.children?.length) this.assignCounts(n.children, counts);
    }
  }

  /** Attach `cuttingCount` to every node (and nested child) in a single query. */
  async attachCuttingCounts(nodes: any[]): Promise<any[]> {
    const ids = this.collectIds(nodes);
    if (ids.length === 0) return nodes;

    const rows = await db
      .select({ sheetId: cuttingOrders.sheetId, count: sql<number>`count(*)::int` })
      .from(cuttingOrders)
      .where(inArray(cuttingOrders.sheetId, ids))
      .groupBy(cuttingOrders.sheetId);

    const counts = new Map<string, number>(rows.map((r) => [r.sheetId, r.count]));
    this.assignCounts(nodes, counts);
    return nodes;
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
          pagination: { page, limit, total: 0, totalPages: 0 },
          matchingSheetIds: [],
        };
      }

      // 2. Walk up to resolve the absolute root parent of each match (cycle-safe)
      const rootIdsSet = new Set<string>();
      for (const sheet of matchingSheets) {
        const root = await this.findRoot(sheet.id);
        if (root) rootIdsSet.add(root.id);
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
        paginatedRootsWithDescendants.push(await this.loadDescendants(root, new Set<string>()));
      }
      await this.attachCuttingCounts(paginatedRootsWithDescendants);

      return {
        data: paginatedRootsWithDescendants,
        pagination: { page, limit, total, totalPages },
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

    await this.attachCuttingCounts(sheets);

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
   * Update sheet info. Uses an explicit field allowlist (no raw spread) so the
   * service is safe regardless of which validator the caller used.
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
    const current = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, id),
    });
    if (!current) return null;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    const allowed: (keyof typeof data)[] = [
      "grade",
      "supplier",
      "notes",
      "status",
      "scrapArea",
      "usedArea",
      "isManualUsage",
      "length",
      "width",
      "thickness",
      "density",
      "kerfAllowance",
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    // Recompute totalArea when dimensions change.
    const newLength = data.length ?? current.length;
    const newWidth = data.width ?? current.width;
    const newTotalArea =
      data.length !== undefined || data.width !== undefined
        ? newLength * newWidth
        : current.totalArea;
    if (data.length !== undefined || data.width !== undefined) {
      updateData.totalArea = newTotalArea;
    }

    // Auto-derive lifecycle status unless the caller set it explicitly.
    if (data.status === undefined) {
      const newUsed = data.usedArea ?? current.usedArea;
      const newScrap = data.scrapArea ?? current.scrapArea;
      updateData.status = this.deriveStatus(newUsed, newScrap, newTotalArea, current.status);
    }

    const [updated] = await db
      .update(masterSheets)
      .set(updateData)
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
   * Recalculate usedArea from all cutting orders, and update lifecycle status.
   *
   * @param executor  db or an active transaction handle.
   * @param forceAuto when true, clears a manual-usage override and recomputes
   *                  from cuts (used after a cutting is added/changed/removed).
   */
  async recalculateUsedArea(sheetId: string, executor: Executor = db, forceAuto = false) {
    const sheet = await executor.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId),
    });

    if (!sheet) return;
    if (sheet.isManualUsage && !forceAuto) {
      return; // respect the manual override
    }

    const [result] = await executor
      .select({
        totalEffectiveArea: sql<number>`COALESCE(SUM(${cuttingOrders.effectiveArea}), 0)`,
      })
      .from(cuttingOrders)
      .where(eq(cuttingOrders.sheetId, sheetId));

    const usedArea = result?.totalEffectiveArea ?? 0;
    const status = this.deriveStatus(usedArea, sheet.scrapArea, sheet.totalArea, sheet.status);

    await executor
      .update(masterSheets)
      .set({
        usedArea,
        isManualUsage: forceAuto ? false : sheet.isManualUsage,
        status,
        updatedAt: new Date(),
      })
      .where(eq(masterSheets.id, sheetId));
  }

  /**
   * Permanently delete a sheet and all its related cuttings (atomic).
   */
  async deleteSheetPermanently(id: string) {
    await db.transaction(async (tx) => {
      await tx.delete(cuttingOrders).where(eq(cuttingOrders.sheetId, id));
      await tx.delete(masterSheets).where(eq(masterSheets.id, id));
    });
  }
}

export const sheetService = new SheetService();
