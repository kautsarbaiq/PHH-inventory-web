// ============================================================
// PHH Inventory — WMS Schema (Receiving / Picking / Placement)
// Backs the PHH WMS mobile app via the shared Express API.
// ============================================================

import { pgTable, text, timestamp, uuid, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---- Storage bins / location tags (Placement) ----
export const bins = pgTable("bins", {
  code: text("code").primaryKey(), // the barcode printed on the location tag
  zone: text("zone").notNull(),
  rack: text("rack").notNull(),
  shelf: text("shelf").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Purchase orders (Receiving + Comparison) ----
export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  poNumber: text("po_number").notNull().unique(),
  supplier: text("supplier").notNull(),
  expectedDate: timestamp("expected_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const poItems = pgTable(
  "po_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poId: uuid("po_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    barcode: text("barcode").notNull(),
    unit: text("unit").notNull().default("pcs"),
    expectedQty: integer("expected_qty").notNull(),
    receivedQty: integer("received_qty").notNull().default(0),
  },
  (t) => ({
    poIdIdx: index("po_items_po_id_idx").on(t.poId),
    barcodeIdx: index("po_items_barcode_idx").on(t.barcode),
  })
);

// ---- Pick lists (Picking) ----
export const pickLists = pgTable("pick_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  customer: text("customer").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pickLines = pgTable(
  "pick_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => pickLists.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    barcode: text("barcode").notNull(),
    binCode: text("bin_code"),
    qtyToPick: integer("qty_to_pick").notNull(),
    qtyPicked: integer("qty_picked").notNull().default(0),
  },
  (t) => ({
    listIdIdx: index("pick_lines_list_id_idx").on(t.listId),
  })
);

// ---- Placement queue (received goods awaiting put-away) ----
export const placementItems = pgTable(
  "placement_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    barcode: text("barcode").notNull(),
    qty: integer("qty").notNull(),
    sourcePo: text("source_po").notNull(),
    binCode: text("bin_code"), // null = awaiting placement
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("placement_items_bin_code_idx").on(t.binCode),
  })
);

// ---- Relations (enable db.query ... with) ----
export const purchaseOrdersRelations = relations(purchaseOrders, ({ many }) => ({
  items: many(poItems),
}));

export const poItemsRelations = relations(poItems, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [poItems.poId],
    references: [purchaseOrders.id],
  }),
}));

export const pickListsRelations = relations(pickLists, ({ many }) => ({
  lines: many(pickLines),
}));

export const pickLinesRelations = relations(pickLines, ({ one }) => ({
  list: one(pickLists, {
    fields: [pickLines.listId],
    references: [pickLists.id],
  }),
}));
