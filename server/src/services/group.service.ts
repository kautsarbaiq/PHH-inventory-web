// ============================================================
// PHH Inventory — Sheet Group Service
// ============================================================

import { eq, desc, sql, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { sheetGroups, sheetGroupItems } from "../db/schema/groups.js";
import { masterSheets } from "../db/schema/sheets.js";
import { sheetService } from "./sheet.service.js";

export class GroupService {
  /**
   * List all sheet groups with their item counts.
   */
  async listGroups() {
    const groups = await db
      .select()
      .from(sheetGroups)
      .orderBy(sql`is_pinned DESC, last_opened_at DESC NULLS LAST, created_at DESC`);

    if (groups.length === 0) return [];

    // Single grouped count instead of one query per group.
    const counts = await db
      .select({ groupId: sheetGroupItems.groupId, count: sql<number>`count(*)::int` })
      .from(sheetGroupItems)
      .where(inArray(sheetGroupItems.groupId, groups.map((g) => g.id)))
      .groupBy(sheetGroupItems.groupId);

    const countMap = new Map<string, number>(counts.map((c) => [c.groupId, c.count]));

    return groups.map((group) => ({
      ...group,
      itemCount: countMap.get(group.id) ?? 0,
    }));
  }

  /**
   * Get a group by ID, including its associated sheets (with cuttingCount).
   */
  async getGroupById(id: string) {
    const group = await db.query.sheetGroups.findFirst({
      where: eq(sheetGroups.id, id),
    });

    if (!group) return null;

    // Fire-and-forget recency update (don't block the read).
    db
      .update(sheetGroups)
      .set({ lastOpenedAt: new Date(), updatedAt: new Date() })
      .where(eq(sheetGroups.id, id))
      .execute()
      .catch((e) => console.error("group lastOpenedAt update failed:", e));

    const items = await db
      .select()
      .from(sheetGroupItems)
      .where(eq(sheetGroupItems.groupId, id))
      .orderBy(sheetGroupItems.createdAt);

    const sheetIds = items.map((item) => item.sheetId);

    let sheets: any[] = [];
    if (sheetIds.length > 0) {
      sheets = await db
        .select()
        .from(masterSheets)
        .where(inArray(masterSheets.id, sheetIds))
        .orderBy(desc(masterSheets.createdAt));
      await sheetService.attachCuttingCounts(sheets);
    }

    return { ...group, sheets };
  }

  /**
   * Create a new sheet group (atomic; sheetIds de-duplicated).
   */
  async createGroup(data: { name: string; description?: string; sheetIds?: string[] }) {
    const uniqueSheetIds = [...new Set(data.sheetIds ?? [])];

    const groupId = await db.transaction(async (tx) => {
      const [group] = await tx
        .insert(sheetGroups)
        .values({ name: data.name, description: data.description ?? null })
        .returning();

      if (uniqueSheetIds.length > 0) {
        await tx
          .insert(sheetGroupItems)
          .values(uniqueSheetIds.map((sheetId) => ({ groupId: group.id, sheetId })));
      }
      return group.id;
    });

    return this.getGroupById(groupId);
  }

  /**
   * Update a group (rename, toggle pin, replace sheet list) atomically.
   */
  async updateGroup(
    id: string,
    data: { name?: string; description?: string; isPinned?: boolean; sheetIds?: string[] }
  ) {
    await db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

      await tx.update(sheetGroups).set(updateData).where(eq(sheetGroups.id, id));

      // Replace items if a new list was provided (delete + insert in one tx).
      if (data.sheetIds !== undefined) {
        await tx.delete(sheetGroupItems).where(eq(sheetGroupItems.groupId, id));
        const uniqueSheetIds = [...new Set(data.sheetIds)];
        if (uniqueSheetIds.length > 0) {
          await tx
            .insert(sheetGroupItems)
            .values(uniqueSheetIds.map((sheetId) => ({ groupId: id, sheetId })));
        }
      }
    });

    return this.getGroupById(id);
  }

  /**
   * Delete a sheet group (atomic).
   */
  async deleteGroup(id: string) {
    await db.transaction(async (tx) => {
      await tx.delete(sheetGroupItems).where(eq(sheetGroupItems.groupId, id));
      await tx.delete(sheetGroups).where(eq(sheetGroups.id, id));
    });
  }
}

export const groupService = new GroupService();
