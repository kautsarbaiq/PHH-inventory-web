// ============================================================
// PHH Inventory — Master Sheets Schema (with Kerf, Scrap & Parent)
// ============================================================

import { pgTable, text, timestamp, real, uuid, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { cuttingOrders } from "./cuttings";

export const masterSheets = pgTable("master_sheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  sheetNumber: text("sheet_number").notNull().unique(),
  grade: text("grade").notNull(),
  supplier: text("supplier").notNull(),
  length: real("length").notNull(),
  width: real("width").notNull(),
  thickness: real("thickness").notNull(),
  density: doublePrecision("density").notNull().default(0),
  totalArea: real("total_area").notNull(),
  usedArea: real("used_area").notNull().default(0),
  scrapArea: real("scrap_area").notNull().default(0),
  kerfAllowance: real("kerf_allowance").notNull().default(2),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  shape: text("shape").notNull().default("rectangle"),
  dimensions: jsonb("dimensions"),
  // Mother-Son tracking
  parentId: uuid("parent_id"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const masterSheetsRelations = relations(masterSheets, ({ many, one }) => ({
  cuttings: many(cuttingOrders),
  creator: one(user, {
    fields: [masterSheets.createdBy],
    references: [user.id],
  }),
  parent: one(masterSheets, {
    fields: [masterSheets.parentId],
    references: [masterSheets.id],
    relationName: "parentChild",
  }),
  children: many(masterSheets, { relationName: "parentChild" }),
}));
