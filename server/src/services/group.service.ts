// ============================================================
// PHH Inventory — Sheet Group Service
// ============================================================

import { eq, desc, sql, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { sheetGroups, sheetGroupItems } from "../db/schema/groups.js";
import { masterSheets } from "../db/schema/sheets.js";

export class GroupService {
  /**
   * List all sheet groups.
   * Sorted by isPinned DESC, then lastOpenedAt DESC (nulls last), then createdAt DESC.
   */
  async listGroups() {
    const groups = await db
      .select()
      .from(sheetGroups)
      .orderBy(
        sql`is_pinned DESC, last_opened_at DESC NULLS LAST, created_at DESC`
      );

    // For each group, count the items in it
    const groupsWithCounts = [];
    for (const group of groups) {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sheetGroupItems)
        .where(eq(sheetGroupItems.groupId, group.id));

      groupsWithCounts.push({
        ...group,
        itemCount: countResult?.count ?? 0,
      });
    }

    return groupsWithCounts;
  }

  /**
   * Get a group by ID, including its associated sheets.
   * Also updates `lastOpenedAt` for the group.
   */
  async getGroupById(id: string) {
    // 1. Update lastOpenedAt
    await db
      .update(sheetGroups)
      .set({ lastOpenedAt: new Date(), updatedAt: new Date() })
      .where(eq(sheetGroups.id, id));

    // 2. Fetch the group
    const group = await db.query.sheetGroups.findFirst({
      where: eq(sheetGroups.id, id),
    });

    if (!group) return null;

    // 3. Fetch all group items (sheets)
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
    }

    return {
      ...group,
      sheets,
    };
  }

  /**
   * Create a new sheet group.
   */
  async createGroup(data: {
    name: string;
    description?: string;
    sheetIds?: string[];
  }) {
    const [group] = await db
      .insert(sheetGroups)
      .values({
        name: data.name,
        description: data.description ?? null,
      })
      .returning();

    // Add sheet items if provided
    if (data.sheetIds && data.sheetIds.length > 0) {
      const values = data.sheetIds.map((sheetId) => ({
        groupId: group.id,
        sheetId,
      }));
      await db.insert(sheetGroupItems).values(values);
    }

    return this.getGroupById(group.id);
  }

  /**
   * Update an existing group (rename, toggle pin, update sheets list).
   */
  async updateGroup(
    id: string,
    data: {
      name?: string;
      description?: string;
      isPinned?: boolean;
      sheetIds?: string[];
    }
  ) {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

    await db
      .update(sheetGroups)
      .set(updateData)
      .where(eq(sheetGroups.id, id));

    // Update items if provided
    if (data.sheetIds !== undefined) {
      // 1. Delete existing items
      await db
        .delete(sheetGroupItems)
        .where(eq(sheetGroupItems.groupId, id));

      // 2. Insert new items
      if (data.sheetIds.length > 0) {
        const values = data.sheetIds.map((sheetId) => ({
          groupId: id,
          sheetId,
        }));
        await db.insert(sheetGroupItems).values(values);
      }
    }

    return this.getGroupById(id);
  }

  /**
   * Delete a sheet group.
   */
  async deleteGroup(id: string) {
    // Explicitly delete items (cascading relation will also handle this, but to be robust)
    await db.delete(sheetGroupItems).where(eq(sheetGroupItems.groupId, id));
    await db.delete(sheetGroups).where(eq(sheetGroups.id, id));
  }
}

export const groupService = new GroupService();
