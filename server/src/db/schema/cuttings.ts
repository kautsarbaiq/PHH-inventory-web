// ============================================================
// PHH Inventory — Cutting Orders Schema (with Position + Rotation)
// ============================================================

import { pgTable, text, timestamp, real, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { masterSheets } from "./sheets.js";
import { user } from "./auth.js";

export const cuttingOrders = pgTable("cutting_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  sheetId: uuid("sheet_id")
    .notNull()
    .references(() => masterSheets.id, { onDelete: "cascade" }),
  jobNumber: text("job_number").notNull(),
  cuttingType: text("cutting_type").notNull(), // rectangle | circle | triangle

  // Dimensions vary by type (stored as JSONB)
  // Rectangle: { length, width }
  // Circle: { radius }
  // Triangle: { base, height }
  dimensions: jsonb("dimensions").notNull(),

  cutArea: real("cut_area").notNull(),
  effectiveArea: real("effective_area").notNull(), // cutArea + kerf

  // Position on canvas (mandatory for visual reconstruction)
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  rotation: real("rotation").notNull().default(0), // degrees

  notes: text("notes"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cuttingOrdersRelations = relations(cuttingOrders, ({ one }) => ({
  sheet: one(masterSheets, {
    fields: [cuttingOrders.sheetId],
    references: [masterSheets.id],
  }),
  creator: one(user, {
    fields: [cuttingOrders.createdBy],
    references: [user.id],
  }),
}));
