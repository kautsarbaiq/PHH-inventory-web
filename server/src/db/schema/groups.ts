// ============================================================
// PHH Inventory — Sheet Groups Schema
// ============================================================

import { pgTable, text, timestamp, uuid, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { masterSheets } from "./sheets";

export const sheetGroups = pgTable("sheet_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  isPinned: boolean("is_pinned").notNull().default(false),
  lastOpenedAt: timestamp("last_opened_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sheetGroupItems = pgTable("sheet_group_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => sheetGroups.id, { onDelete: "cascade" }),
  sheetId: uuid("sheet_id")
    .notNull()
    .references(() => masterSheets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // A sheet can only appear once per group.
  groupSheetUnique: uniqueIndex("sheet_group_items_group_sheet_unique").on(
    table.groupId,
    table.sheetId
  ),
}));

export const sheetGroupsRelations = relations(sheetGroups, ({ many }) => ({
  items: many(sheetGroupItems),
}));

export const sheetGroupItemsRelations = relations(sheetGroupItems, ({ one }) => ({
  group: one(sheetGroups, {
    fields: [sheetGroupItems.groupId],
    references: [sheetGroups.id],
  }),
  sheet: one(masterSheets, {
    fields: [sheetGroupItems.sheetId],
    references: [masterSheets.id],
  }),
}));
