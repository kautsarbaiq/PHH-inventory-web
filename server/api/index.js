import { createRequire as __createRequire } from 'module';
const require = __createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/app.ts
import "dotenv/config";
import dns from "dns";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// src/db/index.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// src/db/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  account: () => account,
  bins: () => bins,
  cuttingOrders: () => cuttingOrders,
  cuttingOrdersRelations: () => cuttingOrdersRelations,
  masterSheets: () => masterSheets,
  masterSheetsRelations: () => masterSheetsRelations,
  pickLines: () => pickLines,
  pickLinesRelations: () => pickLinesRelations,
  pickLists: () => pickLists,
  pickListsRelations: () => pickListsRelations,
  placementItems: () => placementItems,
  poItems: () => poItems,
  poItemsRelations: () => poItemsRelations,
  purchaseOrders: () => purchaseOrders,
  purchaseOrdersRelations: () => purchaseOrdersRelations,
  session: () => session,
  sheetGroupItems: () => sheetGroupItems,
  sheetGroupItemsRelations: () => sheetGroupItemsRelations,
  sheetGroups: () => sheetGroups,
  sheetGroupsRelations: () => sheetGroupsRelations,
  user: () => user,
  verification: () => verification
});

// src/db/schema/auth.ts
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
var user = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("operator"),
  // "operator" | "manager"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var session = pgTable("session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var account = pgTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var verification = pgTable("verification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// src/db/schema/cuttings.ts
import { pgTable as pgTable3, text as text3, timestamp as timestamp3, real as real2, uuid as uuid2, jsonb as jsonb2 } from "drizzle-orm/pg-core";
import { relations as relations2 } from "drizzle-orm";

// src/db/schema/sheets.ts
import { pgTable as pgTable2, text as text2, timestamp as timestamp2, real, uuid, doublePrecision, jsonb, boolean as boolean2, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var masterSheets = pgTable2("master_sheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Unique constraint already enforced in the DB (master_sheets_sheet_number_unique);
  // declared here so the TS schema stays the source of truth.
  sheetNumber: text2("sheet_number").notNull().unique(),
  grade: text2("grade").notNull(),
  supplier: text2("supplier").notNull(),
  length: real("length").notNull(),
  width: real("width").notNull(),
  thickness: real("thickness").notNull(),
  density: doublePrecision("density").notNull().default(0),
  totalArea: real("total_area").notNull(),
  usedArea: real("used_area").notNull().default(0),
  isManualUsage: boolean2("is_manual_usage").notNull().default(false),
  scrapArea: real("scrap_area").notNull().default(0),
  kerfAllowance: real("kerf_allowance").notNull().default(2),
  status: text2("status").notNull().default("active"),
  notes: text2("notes"),
  shape: text2("shape").notNull().default("rectangle"),
  dimensions: jsonb("dimensions"),
  // Mother-Son tracking
  parentId: uuid("parent_id"),
  createdBy: text2("created_by").notNull().references(() => user.id),
  lastOpenedAt: timestamp2("last_opened_at"),
  createdAt: timestamp2("created_at").notNull().defaultNow(),
  updatedAt: timestamp2("updated_at").notNull().defaultNow()
}, (table) => ({
  // Speeds up genealogy children lookups (WHERE parent_id = ...).
  parentIdIdx: index("master_sheets_parent_id_idx").on(table.parentId)
}));
var masterSheetsRelations = relations(masterSheets, ({ many, one }) => ({
  cuttings: many(cuttingOrders),
  creator: one(user, {
    fields: [masterSheets.createdBy],
    references: [user.id]
  }),
  parent: one(masterSheets, {
    fields: [masterSheets.parentId],
    references: [masterSheets.id],
    relationName: "parentChild"
  }),
  children: many(masterSheets, { relationName: "parentChild" })
}));

// src/db/schema/cuttings.ts
var cuttingOrders = pgTable3("cutting_orders", {
  id: uuid2("id").primaryKey().defaultRandom(),
  sheetId: uuid2("sheet_id").notNull().references(() => masterSheets.id, { onDelete: "cascade" }),
  jobNumber: text3("job_number").notNull(),
  cuttingType: text3("cutting_type").notNull(),
  // rectangle | circle | triangle
  // Dimensions vary by type (stored as JSONB)
  // Rectangle: { length, width }
  // Circle: { radius }
  // Triangle: { base, height }
  dimensions: jsonb2("dimensions").notNull(),
  cutArea: real2("cut_area").notNull(),
  effectiveArea: real2("effective_area").notNull(),
  // cutArea + kerf
  // Position on canvas (mandatory for visual reconstruction)
  positionX: real2("position_x").notNull(),
  positionY: real2("position_y").notNull(),
  rotation: real2("rotation").notNull().default(0),
  // degrees
  notes: text3("notes"),
  createdBy: text3("created_by").notNull().references(() => user.id),
  createdAt: timestamp3("created_at").notNull().defaultNow()
});
var cuttingOrdersRelations = relations2(cuttingOrders, ({ one }) => ({
  sheet: one(masterSheets, {
    fields: [cuttingOrders.sheetId],
    references: [masterSheets.id]
  }),
  creator: one(user, {
    fields: [cuttingOrders.createdBy],
    references: [user.id]
  })
}));

// src/db/schema/groups.ts
import { pgTable as pgTable4, text as text4, timestamp as timestamp4, uuid as uuid3, boolean as boolean3, uniqueIndex } from "drizzle-orm/pg-core";
import { relations as relations3 } from "drizzle-orm";
var sheetGroups = pgTable4("sheet_groups", {
  id: uuid3("id").primaryKey().defaultRandom(),
  name: text4("name").notNull(),
  description: text4("description"),
  isPinned: boolean3("is_pinned").notNull().default(false),
  lastOpenedAt: timestamp4("last_opened_at"),
  createdAt: timestamp4("created_at").notNull().defaultNow(),
  updatedAt: timestamp4("updated_at").notNull().defaultNow()
});
var sheetGroupItems = pgTable4("sheet_group_items", {
  id: uuid3("id").primaryKey().defaultRandom(),
  groupId: uuid3("group_id").notNull().references(() => sheetGroups.id, { onDelete: "cascade" }),
  sheetId: uuid3("sheet_id").notNull().references(() => masterSheets.id, { onDelete: "cascade" }),
  createdAt: timestamp4("created_at").notNull().defaultNow()
}, (table) => ({
  // A sheet can only appear once per group.
  groupSheetUnique: uniqueIndex("sheet_group_items_group_sheet_unique").on(
    table.groupId,
    table.sheetId
  )
}));
var sheetGroupsRelations = relations3(sheetGroups, ({ many }) => ({
  items: many(sheetGroupItems)
}));
var sheetGroupItemsRelations = relations3(sheetGroupItems, ({ one }) => ({
  group: one(sheetGroups, {
    fields: [sheetGroupItems.groupId],
    references: [sheetGroups.id]
  }),
  sheet: one(masterSheets, {
    fields: [sheetGroupItems.sheetId],
    references: [masterSheets.id]
  })
}));

// src/db/schema/wms.ts
import { pgTable as pgTable5, text as text5, timestamp as timestamp5, uuid as uuid4, integer, index as index2 } from "drizzle-orm/pg-core";
import { relations as relations4 } from "drizzle-orm";
var bins = pgTable5("bins", {
  code: text5("code").primaryKey(),
  // the barcode printed on the location tag
  zone: text5("zone").notNull(),
  rack: text5("rack").notNull(),
  shelf: text5("shelf").notNull(),
  createdAt: timestamp5("created_at").notNull().defaultNow()
});
var purchaseOrders = pgTable5("purchase_orders", {
  id: uuid4("id").primaryKey().defaultRandom(),
  poNumber: text5("po_number").notNull().unique(),
  supplier: text5("supplier").notNull(),
  expectedDate: timestamp5("expected_date").notNull(),
  createdAt: timestamp5("created_at").notNull().defaultNow()
});
var poItems = pgTable5(
  "po_items",
  {
    id: uuid4("id").primaryKey().defaultRandom(),
    poId: uuid4("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
    sku: text5("sku").notNull(),
    name: text5("name").notNull(),
    barcode: text5("barcode").notNull(),
    unit: text5("unit").notNull().default("pcs"),
    expectedQty: integer("expected_qty").notNull(),
    receivedQty: integer("received_qty").notNull().default(0)
  },
  (t) => ({
    poIdIdx: index2("po_items_po_id_idx").on(t.poId),
    barcodeIdx: index2("po_items_barcode_idx").on(t.barcode)
  })
);
var pickLists = pgTable5("pick_lists", {
  id: uuid4("id").primaryKey().defaultRandom(),
  reference: text5("reference").notNull().unique(),
  customer: text5("customer").notNull(),
  createdAt: timestamp5("created_at").notNull().defaultNow()
});
var pickLines = pgTable5(
  "pick_lines",
  {
    id: uuid4("id").primaryKey().defaultRandom(),
    listId: uuid4("list_id").notNull().references(() => pickLists.id, { onDelete: "cascade" }),
    sku: text5("sku").notNull(),
    name: text5("name").notNull(),
    barcode: text5("barcode").notNull(),
    binCode: text5("bin_code"),
    qtyToPick: integer("qty_to_pick").notNull(),
    qtyPicked: integer("qty_picked").notNull().default(0)
  },
  (t) => ({
    listIdIdx: index2("pick_lines_list_id_idx").on(t.listId)
  })
);
var placementItems = pgTable5(
  "placement_items",
  {
    id: uuid4("id").primaryKey().defaultRandom(),
    sku: text5("sku").notNull(),
    name: text5("name").notNull(),
    barcode: text5("barcode").notNull(),
    qty: integer("qty").notNull(),
    sourcePo: text5("source_po").notNull(),
    binCode: text5("bin_code"),
    // null = awaiting placement
    createdAt: timestamp5("created_at").notNull().defaultNow()
  },
  (t) => ({
    statusIdx: index2("placement_items_bin_code_idx").on(t.binCode)
  })
);
var purchaseOrdersRelations = relations4(purchaseOrders, ({ many }) => ({
  items: many(poItems)
}));
var poItemsRelations = relations4(poItems, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [poItems.poId],
    references: [purchaseOrders.id]
  })
}));
var pickListsRelations = relations4(pickLists, ({ many }) => ({
  lines: many(pickLines)
}));
var pickLinesRelations = relations4(pickLines, ({ one }) => ({
  list: one(pickLists, {
    fields: [pickLines.listId],
    references: [pickLists.id]
  })
}));

// src/db/index.ts
var { Pool } = pg;
var isProduction = process.env.NODE_ENV === "production";
var isSupabase = (process.env.DATABASE_URL || "").includes("supabase");
var caCert = process.env.DATABASE_CA_CERT;
var sslConfig = caCert ? { ca: caCert, rejectUnauthorized: true } : isProduction || isSupabase ? { rejectUnauthorized: false } : void 0;
var isServerless = !!process.env.VERCEL;
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isServerless ? 1 : 10,
  idleTimeoutMillis: isServerless ? 1e4 : 3e4,
  connectionTimeoutMillis: 1e4,
  ...sslConfig ? { ssl: sslConfig } : {}
});
var db = drizzle(pool, { schema: schema_exports });

// src/lib/origins.ts
function parseAllowedOrigins() {
  const env = process.env.CORS_ORIGIN || process.env.CLIENT_URL;
  const isProd = process.env.NODE_ENV === "production";
  const fromEnv = (env || "").split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
  const devDefaults = isProd ? [] : ["http://localhost:5173"];
  const origins = [.../* @__PURE__ */ new Set([...fromEnv, ...devDefaults])];
  if (isProd && origins.length === 0) {
    throw new Error(
      "CORS_ORIGIN (or CLIENT_URL) must be set in production \u2014 refusing to start with an empty origin allowlist."
    );
  }
  return origins;
}

// src/lib/auth.ts
var isProduction2 = process.env.NODE_ENV === "production";
var defaultBaseURL = `http://localhost:${process.env.PORT || 3001}`;
var auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification
    }
  }),
  baseURL: process.env.BETTER_AUTH_URL || defaultBaseURL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8
  },
  trustedOrigins: parseAllowedOrigins(),
  // Throttle credential-stuffing / brute-force against the auth endpoints.
  rateLimit: {
    enabled: true,
    window: 60,
    // seconds
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 }
    }
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "operator",
        // SECURITY: never allow the client to set its own role at sign-up.
        // Roles are assigned server-side (DB seed / admin action) only.
        input: false
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        // Defense-in-depth: force every self-registered user to "operator",
        // even if a future config change re-enables role input.
        before: async (user2) => {
          return { data: { ...user2, role: "operator" } };
        }
      }
    }
  },
  advanced: {
    database: {
      generateId: "uuid"
    },
    defaultCookieAttributes: {
      sameSite: isProduction2 ? "none" : "lax",
      secure: isProduction2
    }
  }
});

// src/routes/index.ts
import { Router as Router5 } from "express";

// src/routes/sheet.routes.ts
import { Router } from "express";

// src/middleware/auth.middleware.ts
import { fromNodeHeaders } from "better-auth/node";
async function requireAuth(req, res, next) {
  try {
    const session2 = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });
    if (!session2) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized \u2014 please sign in"
      });
    }
    req.user = session2.user;
    req.session = session2.session;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Session validation failed"
    });
  }
}

// src/middleware/role.middleware.ts
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user2 = req.user;
    if (!user2) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized \u2014 no user context"
      });
    }
    if (!allowedRoles.includes(user2.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden \u2014 requires one of: ${allowedRoles.join(", ")}`
      });
    }
    next();
  };
}

// src/services/sheet.service.ts
import { eq, ne, sql, and, ilike, gte, isNull, inArray } from "drizzle-orm";
var SheetService = class {
  /**
   * Derive a sheet's lifecycle status from its area accounting.
   * Never overrides an explicit "archived" state.
   */
  deriveStatus(usedArea, scrapArea, totalArea, currentStatus) {
    if (currentStatus === "archived") return "archived";
    return totalArea > 0 && usedArea + scrapArea >= totalArea ? "depleted" : "active";
  }
  /**
   * Create a new master sheet (Goods Receipt).
   */
  async createSheet(data, userId) {
    const totalArea = data.length * data.width;
    const [sheet] = await db.insert(masterSheets).values({
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
      createdBy: userId
    }).returning();
    return sheet;
  }
  /**
   * Create a Son Sheet from remaining material of a parent sheet.
   */
  async createSonSheet(parentId, data, userId) {
    const parent = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, parentId)
    });
    if (!parent) {
      throw new Error("Parent sheet not found");
    }
    if (data.length > parent.length || data.width > parent.width) {
      throw new Error("Son sheet dimensions cannot exceed the parent sheet");
    }
    const totalArea = data.length * data.width;
    const [sonSheet] = await db.insert(masterSheets).values({
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
      parentId,
      createdBy: userId
    }).returning();
    return sonSheet;
  }
  /**
   * Create a Son Sheet directly from a cutting order (inherits shape and dimensions)
   */
  async createSonFromCutting(sheetId, cuttingId, userId, customName) {
    const parent = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId)
    });
    if (!parent) throw new Error("Parent sheet not found");
    const cutting = await db.query.cuttingOrders.findFirst({
      where: eq(cuttingOrders.id, cuttingId)
    });
    if (!cutting) throw new Error("Cutting order not found");
    if (cutting.sheetId !== sheetId) throw new Error("Cutting order does not belong to this sheet");
    let length = 0;
    let width = 0;
    const dims = cutting.dimensions || {};
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
    const totalArea = cutting.cutArea;
    const trimmedName = customName?.trim();
    const finalSheetNumber = trimmedName && trimmedName.length > 0 ? trimmedName : `${cutting.jobNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
    const [sonSheet] = await db.insert(masterSheets).values({
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
      createdBy: userId
    }).returning();
    return sonSheet;
  }
  /**
   * Get genealogy tree for a sheet (finds root, then builds tree downward).
   */
  async getGenealogy(sheetId) {
    const rootSheet = await this.findRoot(sheetId);
    if (!rootSheet) return null;
    return this.buildGenealogyNode(rootSheet.id, /* @__PURE__ */ new Set());
  }
  /**
   * Walk up parentId to the absolute root, with cycle protection.
   */
  async findRoot(sheetId) {
    const visited = /* @__PURE__ */ new Set();
    let current = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId)
    });
    if (!current) return null;
    while (current && current.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = await db.query.masterSheets.findFirst({
        where: eq(masterSheets.id, current.parentId)
      });
      if (!parent || visited.has(parent.id)) break;
      current = parent;
    }
    return current;
  }
  async buildGenealogyNode(sheetId, visited) {
    if (visited.has(sheetId)) return null;
    visited.add(sheetId);
    const sheet = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId)
    });
    if (!sheet) return null;
    const children = await db.select().from(masterSheets).where(eq(masterSheets.parentId, sheetId)).orderBy(masterSheets.createdAt);
    const childNodes = [];
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
      status: sheet.status,
      parentId: sheet.parentId,
      children: childNodes
    };
  }
  /**
   * Get genealogy trees for multiple sheets (batch).
   * Deduplicates by finding unique roots.
   */
  async getGenealogyBatch(sheetIds) {
    const rootIds = /* @__PURE__ */ new Set();
    const trees = [];
    for (const sheetId of sheetIds) {
      const root = await this.findRoot(sheetId);
      if (!root) continue;
      if (!rootIds.has(root.id)) {
        rootIds.add(root.id);
        const tree = await this.buildGenealogyNode(root.id, /* @__PURE__ */ new Set());
        if (tree) trees.push(tree);
      }
    }
    return trees;
  }
  /**
   * Get a sheet by ID with computed stats and cutting count.
   */
  async getSheetById(id) {
    const sheet = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, id)
    });
    if (!sheet) return null;
    db.update(masterSheets).set({ lastOpenedAt: /* @__PURE__ */ new Date() }).where(eq(masterSheets.id, id)).execute().catch((e) => console.error("lastOpenedAt update failed:", e));
    const [countResult] = await db.select({ count: sql`count(*)::int` }).from(cuttingOrders).where(eq(cuttingOrders.sheetId, id));
    const availableArea = Math.max(0, sheet.totalArea - sheet.usedArea - sheet.scrapArea);
    const usedPercentage = sheet.totalArea > 0 ? sheet.usedArea / sheet.totalArea * 100 : 0;
    const availablePercentage = sheet.totalArea > 0 ? availableArea / sheet.totalArea * 100 : 0;
    return {
      ...sheet,
      status: sheet.status,
      parentId: sheet.parentId,
      availableArea,
      usedPercentage: Math.round(usedPercentage * 100) / 100,
      availablePercentage: Math.round(availablePercentage * 100) / 100,
      cuttingCount: countResult?.count ?? 0
    };
  }
  /**
   * Helper to recursively load all descendants of a sheet (cycle-safe).
   */
  async loadDescendants(sheet, visited) {
    if (visited.has(sheet.id)) return { ...sheet, children: [] };
    visited.add(sheet.id);
    const children = await db.select().from(masterSheets).where(eq(masterSheets.parentId, sheet.id)).orderBy(masterSheets.createdAt);
    const childrenWithDescendants = [];
    for (const child of children) {
      childrenWithDescendants.push(await this.loadDescendants(child, visited));
    }
    return { ...sheet, children: childrenWithDescendants };
  }
  // ---- cuttingCount enrichment helpers ------------------------------
  collectIds(nodes, acc = []) {
    for (const n of nodes) {
      acc.push(n.id);
      if (n.children?.length) this.collectIds(n.children, acc);
    }
    return acc;
  }
  assignCounts(nodes, counts) {
    for (const n of nodes) {
      n.cuttingCount = counts.get(n.id) ?? 0;
      if (n.children?.length) this.assignCounts(n.children, counts);
    }
  }
  /** Attach `cuttingCount` to every node (and nested child) in a single query. */
  async attachCuttingCounts(nodes) {
    const ids = this.collectIds(nodes);
    if (ids.length === 0) return nodes;
    const rows = await db.select({ sheetId: cuttingOrders.sheetId, count: sql`count(*)::int` }).from(cuttingOrders).where(inArray(cuttingOrders.sheetId, ids)).groupBy(cuttingOrders.sheetId);
    const counts = new Map(rows.map((r) => [r.sheetId, r.count]));
    this.assignCounts(nodes, counts);
    return nodes;
  }
  /**
   * List sheets with optional search, filter, and pagination.
   */
  async listSheets(params) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;
    if (params.search) {
      const conditions2 = [ilike(masterSheets.sheetNumber, `%${params.search}%`)];
      if (params.status) {
        conditions2.push(eq(masterSheets.status, params.status));
      }
      if (params.excludeStatus) {
        conditions2.push(ne(masterSheets.status, params.excludeStatus));
      }
      if (params.thickness !== void 0 && params.thickness > 0) {
        conditions2.push(eq(masterSheets.thickness, params.thickness));
      }
      if (params.minLength !== void 0 && params.minLength > 0) {
        conditions2.push(gte(masterSheets.length, params.minLength));
      }
      if (params.minWidth !== void 0 && params.minWidth > 0) {
        conditions2.push(gte(masterSheets.width, params.minWidth));
      }
      const matchingSheets = await db.select().from(masterSheets).where(and(...conditions2));
      const matchingIds = matchingSheets.map((s) => s.id);
      if (matchingSheets.length === 0) {
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          matchingSheetIds: []
        };
      }
      const rootIdsSet = /* @__PURE__ */ new Set();
      for (const sheet of matchingSheets) {
        const root = await this.findRoot(sheet.id);
        if (root) rootIdsSet.add(root.id);
      }
      const rootIds = Array.from(rootIdsSet);
      const roots = await db.select().from(masterSheets).where(inArray(masterSheets.id, rootIds)).orderBy(sql`${masterSheets.lastOpenedAt} DESC NULLS LAST, ${masterSheets.createdAt} DESC`);
      const total = roots.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedRoots = roots.slice(offset, offset + limit);
      const paginatedRootsWithDescendants = [];
      for (const root of paginatedRoots) {
        paginatedRootsWithDescendants.push(await this.loadDescendants(root, /* @__PURE__ */ new Set()));
      }
      await this.attachCuttingCounts(paginatedRootsWithDescendants);
      return {
        data: paginatedRootsWithDescendants,
        pagination: { page, limit, total, totalPages },
        matchingSheetIds: matchingIds
      };
    }
    const conditions = [];
    if (params.status) {
      conditions.push(eq(masterSheets.status, params.status));
    }
    if (params.excludeStatus) {
      conditions.push(ne(masterSheets.status, params.excludeStatus));
    }
    if (params.thickness !== void 0 && params.thickness > 0) {
      conditions.push(eq(masterSheets.thickness, params.thickness));
    }
    if (params.minLength !== void 0 && params.minLength > 0) {
      conditions.push(gte(masterSheets.length, params.minLength));
    }
    if (params.minWidth !== void 0 && params.minWidth > 0) {
      conditions.push(gte(masterSheets.width, params.minWidth));
    }
    if (params.isRootOnly) {
      conditions.push(isNull(masterSheets.parentId));
    }
    if (params.parentId) {
      conditions.push(eq(masterSheets.parentId, params.parentId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
    const [sheets, [countResult]] = await Promise.all([
      db.select().from(masterSheets).where(whereClause).orderBy(sql`${masterSheets.lastOpenedAt} DESC NULLS LAST, ${masterSheets.createdAt} DESC`).limit(limit).offset(offset),
      db.select({ count: sql`count(*)::int` }).from(masterSheets).where(whereClause)
    ]);
    await this.attachCuttingCounts(sheets);
    return {
      data: sheets,
      pagination: {
        page,
        limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit)
      },
      matchingSheetIds: []
    };
  }
  /**
   * Update sheet info. Uses an explicit field allowlist (no raw spread) so the
   * service is safe regardless of which validator the caller used.
   */
  async updateSheet(id, data) {
    const current = await db.query.masterSheets.findFirst({
      where: eq(masterSheets.id, id)
    });
    if (!current) return null;
    const updateData = { updatedAt: /* @__PURE__ */ new Date() };
    const allowed = [
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
      "kerfAllowance"
    ];
    for (const key of allowed) {
      if (data[key] !== void 0) updateData[key] = data[key];
    }
    const newLength = data.length ?? current.length;
    const newWidth = data.width ?? current.width;
    const newTotalArea = data.length !== void 0 || data.width !== void 0 ? newLength * newWidth : current.totalArea;
    if (data.length !== void 0 || data.width !== void 0) {
      updateData.totalArea = newTotalArea;
    }
    if (data.status === void 0) {
      const newUsed = data.usedArea ?? current.usedArea;
      const newScrap = data.scrapArea ?? current.scrapArea;
      updateData.status = this.deriveStatus(newUsed, newScrap, newTotalArea, current.status);
    }
    const [updated] = await db.update(masterSheets).set(updateData).where(eq(masterSheets.id, id)).returning();
    return updated ?? null;
  }
  /**
   * Archive a sheet (soft delete).
   */
  async archiveSheet(id) {
    await db.update(masterSheets).set({ status: "archived", updatedAt: /* @__PURE__ */ new Date() }).where(eq(masterSheets.id, id));
  }
  /**
   * Recalculate usedArea from all cutting orders, and update lifecycle status.
   *
   * @param executor  db or an active transaction handle.
   * @param forceAuto when true, clears a manual-usage override and recomputes
   *                  from cuts (used after a cutting is added/changed/removed).
   */
  async recalculateUsedArea(sheetId, executor = db, forceAuto = false) {
    const sheet = await executor.query.masterSheets.findFirst({
      where: eq(masterSheets.id, sheetId)
    });
    if (!sheet) return;
    if (sheet.isManualUsage && !forceAuto) {
      return;
    }
    const [result] = await executor.select({
      totalEffectiveArea: sql`COALESCE(SUM(${cuttingOrders.effectiveArea}), 0)`
    }).from(cuttingOrders).where(eq(cuttingOrders.sheetId, sheetId));
    const usedArea = result?.totalEffectiveArea ?? 0;
    const status = this.deriveStatus(usedArea, sheet.scrapArea, sheet.totalArea, sheet.status);
    await executor.update(masterSheets).set({
      usedArea,
      isManualUsage: forceAuto ? false : sheet.isManualUsage,
      status,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(masterSheets.id, sheetId));
  }
  /**
   * Permanently delete a sheet and all its related cuttings (atomic).
   */
  async deleteSheetPermanently(id) {
    await db.transaction(async (tx) => {
      await tx.delete(cuttingOrders).where(eq(cuttingOrders.sheetId, id));
      await tx.delete(masterSheets).where(eq(masterSheets.id, id));
    });
  }
};
var sheetService = new SheetService();

// ../packages/shared/src/constants.ts
var CUTTING_TYPES = {
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  TRIANGLE: "triangle"
};
var SHEET_STATUS = {
  ACTIVE: "active",
  DEPLETED: "depleted",
  ARCHIVED: "archived"
};
var DEFAULT_KERF_ALLOWANCE = 2;
var MIN_CUT_DIMENSION = 5;

// ../packages/shared/src/geometry.ts
function calculateCutArea(type, dimensions) {
  let area = 0;
  switch (type) {
    case "rectangle": {
      const d = dimensions;
      area = d.length * d.width;
      break;
    }
    case "circle": {
      const d = dimensions;
      area = Math.PI * d.radius * d.radius;
      break;
    }
    case "triangle": {
      const d = dimensions;
      area = 0.5 * d.base * d.height;
      break;
    }
    default:
      return 0;
  }
  return Number.isFinite(area) ? area : 0;
}
function calculatePerimeter(type, dimensions) {
  switch (type) {
    case "rectangle": {
      const d = dimensions;
      return 2 * (d.length + d.width);
    }
    case "circle": {
      const d = dimensions;
      return 2 * Math.PI * d.radius;
    }
    case "triangle": {
      const d = dimensions;
      const halfBase = d.base / 2;
      const side = Math.sqrt(halfBase * halfBase + d.height * d.height);
      return d.base + 2 * side;
    }
    default:
      return 0;
  }
}
function calculateEffectiveArea(type, dimensions, kerfAllowance) {
  const cutArea = calculateCutArea(type, dimensions);
  const perimeter = calculatePerimeter(type, dimensions);
  const result = cutArea + perimeter * kerfAllowance;
  return Number.isFinite(result) ? result : 0;
}
function getBoundingBox(type, dimensions, posX, posY, rotation = 0, kerfMargin = 0) {
  const rad = rotation * Math.PI / 180;
  const cosR = Math.abs(Math.cos(rad));
  const sinR = Math.abs(Math.sin(rad));
  let halfW;
  let halfH;
  switch (type) {
    case "rectangle": {
      const d = dimensions;
      halfW = (d.length * cosR + d.width * sinR) / 2;
      halfH = (d.length * sinR + d.width * cosR) / 2;
      break;
    }
    case "circle": {
      const d = dimensions;
      halfW = d.radius;
      halfH = d.radius;
      break;
    }
    case "triangle": {
      const d = dimensions;
      halfW = (d.base * cosR + d.height * sinR) / 2;
      halfH = (d.base * sinR + d.height * cosR) / 2;
      break;
    }
    default:
      halfW = 0;
      halfH = 0;
  }
  halfW += kerfMargin / 2;
  halfH += kerfMargin / 2;
  return { x1: posX - halfW, y1: posY - halfH, x2: posX + halfW, y2: posY + halfH };
}
function checkOverlap(a, b) {
  return !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
}
function checkWithinSheet(bb, sheetLength, sheetWidth) {
  return bb.x1 >= 0 && bb.y1 >= 0 && bb.x2 <= sheetLength && bb.y2 <= sheetWidth;
}
function getCenterFromTopLeft(type, dims, topLeftX, topLeftY) {
  switch (type) {
    case "rectangle": {
      const d = dims;
      return { centerX: topLeftX + d.length / 2, centerY: topLeftY + d.width / 2 };
    }
    case "circle":
      return { centerX: topLeftX, centerY: topLeftY };
    case "triangle": {
      const d = dims;
      return { centerX: topLeftX + d.base / 2, centerY: topLeftY + d.height / 2 };
    }
    default:
      return { centerX: topLeftX, centerY: topLeftY };
  }
}
function validatePlacement(sheetLength, sheetWidth, kerfAllowance, existingCuttings, newCutting) {
  const errors = [];
  const { centerX, centerY } = getCenterFromTopLeft(
    newCutting.cuttingType,
    newCutting.dimensions,
    newCutting.positionX,
    newCutting.positionY
  );
  const newBB = getBoundingBox(
    newCutting.cuttingType,
    newCutting.dimensions,
    centerX,
    centerY,
    newCutting.rotation || 0,
    kerfAllowance
  );
  if (!checkWithinSheet(newBB, sheetLength, sheetWidth)) {
    errors.push(
      `Cutting exceeds sheet boundary. BB: [${newBB.x1.toFixed(1)}, ${newBB.y1.toFixed(1)}] to [${newBB.x2.toFixed(1)}, ${newBB.y2.toFixed(1)}], Sheet: [0, 0] to [${sheetLength}, ${sheetWidth}]`
    );
  }
  for (const existing of existingCuttings) {
    const existDims = typeof existing.dimensions === "string" ? JSON.parse(existing.dimensions) : existing.dimensions;
    const { centerX: existCX, centerY: existCY } = getCenterFromTopLeft(
      existing.cuttingType,
      existDims,
      existing.positionX,
      existing.positionY
    );
    const existingBB = getBoundingBox(
      existing.cuttingType,
      existDims,
      existCX,
      existCY,
      existing.rotation || 0,
      kerfAllowance
    );
    if (checkOverlap(newBB, existingBB)) {
      errors.push(`Cutting overlaps with existing cut at (${existing.positionX}, ${existing.positionY})`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ../packages/shared/src/validators/index.ts
import { z } from "zod";
var createSheetSchema = z.object({
  sheetNumber: z.string().min(1, "Sheet number is required").max(50, "Sheet number too long"),
  grade: z.string().min(1, "Grade is required"),
  supplier: z.string().min(1, "Supplier is required"),
  length: z.number().positive("Length must be positive").min(MIN_CUT_DIMENSION, `Min length is ${MIN_CUT_DIMENSION}mm`),
  width: z.number().positive("Width must be positive").min(MIN_CUT_DIMENSION, `Min width is ${MIN_CUT_DIMENSION}mm`),
  thickness: z.number().positive("Thickness must be positive"),
  density: z.number().positive("Density must be positive"),
  kerfAllowance: z.number().nonnegative("Kerf cannot be negative").default(DEFAULT_KERF_ALLOWANCE),
  notes: z.string().optional()
});
var updateSheetSchema = z.object({
  grade: z.string().min(1).optional(),
  supplier: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum([SHEET_STATUS.ACTIVE, SHEET_STATUS.DEPLETED, SHEET_STATUS.ARCHIVED]).optional(),
  scrapArea: z.number().nonnegative("Scrap area cannot be negative").optional(),
  usedArea: z.number().nonnegative("Used area cannot be negative").optional(),
  isManualUsage: z.boolean().optional(),
  length: z.number().positive().min(MIN_CUT_DIMENSION).optional(),
  width: z.number().positive().min(MIN_CUT_DIMENSION).optional(),
  thickness: z.number().positive().optional(),
  density: z.number().positive().optional(),
  kerfAllowance: z.number().nonnegative().optional()
});
var createSonSheetSchema = z.object({
  sheetNumber: z.string().min(1, "Sheet number is required").max(50, "Sheet number too long"),
  length: z.number().positive("Length must be positive").min(MIN_CUT_DIMENSION, `Min length is ${MIN_CUT_DIMENSION}mm`),
  width: z.number().positive("Width must be positive").min(MIN_CUT_DIMENSION, `Min width is ${MIN_CUT_DIMENSION}mm`),
  thickness: z.number().positive("Thickness must be positive"),
  grade: z.string().min(1).optional(),
  supplier: z.string().min(1).optional(),
  kerfAllowance: z.number().nonnegative("Kerf cannot be negative").optional(),
  notes: z.string().optional()
});
var rectangleDimensionsSchema = z.object({
  length: z.number().positive().min(MIN_CUT_DIMENSION),
  width: z.number().positive().min(MIN_CUT_DIMENSION)
});
var circleDimensionsSchema = z.object({
  radius: z.number().positive().min(MIN_CUT_DIMENSION / 2)
});
var triangleDimensionsSchema = z.object({
  base: z.number().positive().min(MIN_CUT_DIMENSION),
  height: z.number().positive().min(MIN_CUT_DIMENSION)
});
var createCuttingSchema = z.object({
  jobNumber: z.string().min(1, "Job number is required"),
  cuttingType: z.enum([
    CUTTING_TYPES.RECTANGLE,
    CUTTING_TYPES.CIRCLE,
    CUTTING_TYPES.TRIANGLE
  ]),
  dimensions: z.union([
    rectangleDimensionsSchema,
    circleDimensionsSchema,
    triangleDimensionsSchema
  ]),
  positionX: z.number().nonnegative("Position X cannot be negative"),
  positionY: z.number().nonnegative("Position Y cannot be negative"),
  rotation: z.number().min(0).max(360).default(0),
  notes: z.string().optional()
}).refine((data) => dimensionsMatchType(data.cuttingType, data.dimensions), {
  message: "Dimensions do not match cutting type"
});
var updatePositionSchema = z.object({
  positionX: z.number().nonnegative(),
  positionY: z.number().nonnegative(),
  rotation: z.number().min(0).max(360).optional()
});
var genealogyBatchSchema = z.object({
  sheetIds: z.array(z.string().uuid("Invalid sheet id")).min(1, "sheetIds must be a non-empty array").max(200, "Too many sheet ids (max 200)")
});
var wmsScanSchema = z.object({
  barcode: z.string().trim().min(1, "Barcode is required").max(64, "Barcode too long")
});
var wmsPlaceSchema = z.object({
  locationCode: z.string().trim().min(1, "Location code is required").max(64, "Location code too long")
});
function dimensionsMatchType(type, dimensions) {
  if (type === CUTTING_TYPES.RECTANGLE) {
    return !!dimensions && "length" in dimensions && "width" in dimensions;
  }
  if (type === CUTTING_TYPES.CIRCLE) {
    return !!dimensions && "radius" in dimensions;
  }
  if (type === CUTTING_TYPES.TRIANGLE) {
    return !!dimensions && "base" in dimensions && "height" in dimensions;
  }
  return false;
}
var updateCuttingSchema = z.object({
  jobNumber: z.string().min(1, "Job number is required").optional(),
  notes: z.string().optional(),
  dimensions: z.union([
    rectangleDimensionsSchema,
    circleDimensionsSchema,
    triangleDimensionsSchema
  ]).optional()
});
var makeSonSchema = z.object({
  customName: z.string().trim().min(1, "Custom name cannot be empty").max(50, "Sheet number too long").optional()
});
var createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100, "Group name too long"),
  description: z.string().max(500).optional(),
  sheetIds: z.array(z.string().uuid("Invalid sheet id")).optional()
});
var updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPinned: z.boolean().optional(),
  sheetIds: z.array(z.string().uuid("Invalid sheet id")).optional()
});

// src/utils/http-error.ts
function respondError(res, error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/not found/i.test(message)) {
    return res.status(404).json({ success: false, error: message });
  }
  if (/unique|duplicate key/i.test(message)) {
    return res.status(409).json({ success: false, error: "Resource already exists" });
  }
  if (/does not belong|not active|placement invalid|invalid position|exceeds sheet|overlaps|cannot be empty|must be|is required|cannot add|cannot exceed/i.test(
    message
  )) {
    return res.status(400).json({ success: false, error: message });
  }
  console.error("Unhandled route error:", error);
  return res.status(500).json({ success: false, error: "Internal server error" });
}

// src/routes/sheet.routes.ts
var router = Router();
router.use(requireAuth);
router.get("/", async (req, res) => {
  try {
    const { page, limit, search, status, excludeStatus, thickness, minLength, minWidth, isRootOnly, parentId } = req.query;
    const result = await sheetService.listSheets({
      page: page ? Number(page) : void 0,
      limit: limit ? Number(limit) : void 0,
      search,
      status,
      excludeStatus,
      isRootOnly: isRootOnly === "true",
      parentId,
      thickness: thickness ? Number(thickness) : void 0,
      minLength: minLength ? Number(minLength) : void 0,
      minWidth: minWidth ? Number(minWidth) : void 0
    });
    res.json({ success: true, ...result });
  } catch (error) {
    respondError(res, error);
  }
});
router.post("/genealogy-batch", async (req, res) => {
  try {
    const parsed = genealogyBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const trees = await sheetService.getGenealogyBatch(parsed.data.sheetIds);
    res.json({ success: true, data: trees });
  } catch (error) {
    respondError(res, error);
  }
});
router.get("/:id", async (req, res) => {
  try {
    const sheet = await sheetService.getSheetById(req.params.id);
    if (!sheet) {
      return res.status(404).json({ success: false, error: "Sheet not found" });
    }
    res.json({ success: true, data: sheet });
  } catch (error) {
    respondError(res, error);
  }
});
router.get("/:id/genealogy", async (req, res) => {
  try {
    const tree = await sheetService.getGenealogy(req.params.id);
    if (!tree) {
      return res.status(404).json({ success: false, error: "Sheet not found" });
    }
    res.json({ success: true, data: tree });
  } catch (error) {
    respondError(res, error);
  }
});
router.post("/", requireRole("manager"), async (req, res) => {
  try {
    const parsed = createSheetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const sheet = await sheetService.createSheet(parsed.data, req.user.id);
    res.status(201).json({ success: true, data: sheet });
  } catch (error) {
    respondError(res, error);
  }
});
router.post("/:id/son", requireRole("manager"), async (req, res) => {
  try {
    const parsed = createSonSheetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const sonSheet = await sheetService.createSonSheet(req.params.id, parsed.data, req.user.id);
    res.status(201).json({ success: true, data: sonSheet });
  } catch (error) {
    respondError(res, error);
  }
});
router.post(
  "/:id/cuttings/:cuttingId/make-son",
  requireRole("manager"),
  async (req, res) => {
    try {
      const parsed = makeSonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors
        });
      }
      const sonSheet = await sheetService.createSonFromCutting(
        req.params.id,
        req.params.cuttingId,
        req.user.id,
        parsed.data.customName
      );
      res.status(201).json({ success: true, data: sonSheet });
    } catch (error) {
      respondError(res, error);
    }
  }
);
router.patch("/:id", requireRole("manager"), async (req, res) => {
  try {
    const parsed = updateSheetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const updated = await sheetService.updateSheet(req.params.id, parsed.data);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Sheet not found" });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    respondError(res, error);
  }
});
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    await sheetService.archiveSheet(req.params.id);
    res.json({ success: true, data: { message: "Sheet archived" } });
  } catch (error) {
    respondError(res, error);
  }
});
router.delete("/:id/permanent", requireRole("manager"), async (req, res) => {
  try {
    await sheetService.deleteSheetPermanently(req.params.id);
    res.json({ success: true, data: { message: "Sheet permanently deleted" } });
  } catch (error) {
    respondError(res, error);
  }
});
var sheetRoutes = router;

// src/routes/cutting.routes.ts
import { Router as Router2 } from "express";

// src/services/cutting.service.ts
import { eq as eq2, and as and2 } from "drizzle-orm";
function dimensionsMatchType2(type, dims) {
  if (!dims || typeof dims !== "object") return false;
  if (type === "rectangle") return "length" in dims && "width" in dims;
  if (type === "circle") return "radius" in dims;
  if (type === "triangle") return "base" in dims && "height" in dims;
  return false;
}
var CuttingService = class {
  /**
   * Create a cutting order with collision validation.
   * Runs inside a transaction that locks the sheet row (FOR UPDATE) so two
   * concurrent placements on the same sheet cannot both pass collision and
   * then overlap (TOCTOU), and so the usedArea recalculation is atomic.
   */
  async createCutting(sheetId, data, userId) {
    return db.transaction(async (tx) => {
      const [sheet] = await tx.select().from(masterSheets).where(eq2(masterSheets.id, sheetId)).for("update");
      if (!sheet) {
        throw new Error("Sheet not found");
      }
      if (sheet.status !== "active") {
        throw new Error("Sheet is not active \u2014 cannot add cuttings");
      }
      const existingCuttings = await tx.select().from(cuttingOrders).where(eq2(cuttingOrders.sheetId, sheetId));
      const validation = validatePlacement(
        sheet.length,
        sheet.width,
        sheet.kerfAllowance,
        existingCuttings.map((c) => ({
          cuttingType: c.cuttingType,
          dimensions: c.dimensions,
          positionX: c.positionX,
          positionY: c.positionY,
          rotation: c.rotation
        })),
        {
          cuttingType: data.cuttingType,
          dimensions: data.dimensions,
          positionX: data.positionX,
          positionY: data.positionY,
          rotation: data.rotation ?? 0
        }
      );
      if (!validation.valid) {
        throw new Error(`Placement invalid: ${validation.errors.join("; ")}`);
      }
      const cutArea = calculateCutArea(data.cuttingType, data.dimensions);
      const effectiveArea = calculateEffectiveArea(
        data.cuttingType,
        data.dimensions,
        sheet.kerfAllowance
      );
      const [cutting] = await tx.insert(cuttingOrders).values({
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
        createdBy: userId
      }).returning();
      await sheetService.recalculateUsedArea(sheetId, tx, true);
      return cutting;
    });
  }
  /**
   * Get all cuttings for a sheet.
   */
  async getCuttingsBySheet(sheetId) {
    return db.select().from(cuttingOrders).where(eq2(cuttingOrders.sheetId, sheetId)).orderBy(cuttingOrders.createdAt);
  }
  /**
   * Update cutting position (after drag-and-drop).
   */
  async updateCuttingPosition(id, sheetId, position) {
    return db.transaction(async (tx) => {
      const [sheet] = await tx.select().from(masterSheets).where(eq2(masterSheets.id, sheetId)).for("update");
      if (!sheet) throw new Error("Sheet not found");
      const [targetCutting] = await tx.select().from(cuttingOrders).where(and2(eq2(cuttingOrders.id, id), eq2(cuttingOrders.sheetId, sheetId)));
      if (!targetCutting) throw new Error("Cutting not found");
      const others = await tx.select().from(cuttingOrders).where(eq2(cuttingOrders.sheetId, sheetId));
      const filtered = others.filter((c) => c.id !== id);
      const validation = validatePlacement(
        sheet.length,
        sheet.width,
        sheet.kerfAllowance,
        filtered.map((c) => ({
          cuttingType: c.cuttingType,
          dimensions: c.dimensions,
          positionX: c.positionX,
          positionY: c.positionY,
          rotation: c.rotation
        })),
        {
          cuttingType: targetCutting.cuttingType,
          dimensions: targetCutting.dimensions,
          positionX: position.positionX,
          positionY: position.positionY,
          rotation: position.rotation ?? targetCutting.rotation
        }
      );
      if (!validation.valid) {
        throw new Error(`Invalid position: ${validation.errors.join("; ")}`);
      }
      const [updated] = await tx.update(cuttingOrders).set({
        positionX: position.positionX,
        positionY: position.positionY,
        rotation: position.rotation ?? targetCutting.rotation
      }).where(eq2(cuttingOrders.id, id)).returning();
      return updated;
    });
  }
  /**
   * Update cutting order details (jobNumber, dimensions, notes) with collision validation.
   */
  async updateCutting(id, sheetId, data) {
    return db.transaction(async (tx) => {
      const [sheet] = await tx.select().from(masterSheets).where(eq2(masterSheets.id, sheetId)).for("update");
      if (!sheet) throw new Error("Sheet not found");
      const [targetCutting] = await tx.select().from(cuttingOrders).where(and2(eq2(cuttingOrders.id, id), eq2(cuttingOrders.sheetId, sheetId)));
      if (!targetCutting) throw new Error("Cutting not found");
      const updatedJobNumber = data.jobNumber ?? targetCutting.jobNumber;
      const updatedNotes = data.notes !== void 0 ? data.notes : targetCutting.notes;
      const updatedDimensions = data.dimensions ?? targetCutting.dimensions;
      let cutArea = targetCutting.cutArea;
      let effectiveArea = targetCutting.effectiveArea;
      if (data.dimensions) {
        if (!dimensionsMatchType2(targetCutting.cuttingType, data.dimensions)) {
          throw new Error("Dimensions do not match cutting type");
        }
        const others = await tx.select().from(cuttingOrders).where(eq2(cuttingOrders.sheetId, sheetId));
        const filtered = others.filter((c) => c.id !== id);
        const validation = validatePlacement(
          sheet.length,
          sheet.width,
          sheet.kerfAllowance,
          filtered.map((c) => ({
            cuttingType: c.cuttingType,
            dimensions: c.dimensions,
            positionX: c.positionX,
            positionY: c.positionY,
            rotation: c.rotation
          })),
          {
            cuttingType: targetCutting.cuttingType,
            dimensions: updatedDimensions,
            positionX: targetCutting.positionX,
            positionY: targetCutting.positionY,
            rotation: targetCutting.rotation
          }
        );
        if (!validation.valid) {
          throw new Error(`Placement invalid: ${validation.errors.join("; ")}`);
        }
        cutArea = calculateCutArea(targetCutting.cuttingType, updatedDimensions);
        effectiveArea = calculateEffectiveArea(
          targetCutting.cuttingType,
          updatedDimensions,
          sheet.kerfAllowance
        );
      }
      const [updated] = await tx.update(cuttingOrders).set({
        jobNumber: updatedJobNumber,
        notes: updatedNotes,
        dimensions: updatedDimensions,
        cutArea,
        effectiveArea
      }).where(eq2(cuttingOrders.id, id)).returning();
      if (data.dimensions) {
        await sheetService.recalculateUsedArea(sheetId, tx, true);
      }
      return updated;
    });
  }
  /**
   * Delete a cutting order and recalculate sheet usage (atomic).
   */
  async deleteCutting(id, sheetId) {
    return db.transaction(async (tx) => {
      await tx.select().from(masterSheets).where(eq2(masterSheets.id, sheetId)).for("update");
      await tx.delete(cuttingOrders).where(and2(eq2(cuttingOrders.id, id), eq2(cuttingOrders.sheetId, sheetId)));
      await sheetService.recalculateUsedArea(sheetId, tx, true);
    });
  }
};
var cuttingService = new CuttingService();

// src/routes/cutting.routes.ts
var router2 = Router2({ mergeParams: true });
router2.use(requireAuth);
router2.get("/", async (req, res) => {
  try {
    const cuttings = await cuttingService.getCuttingsBySheet(req.params.sheetId);
    res.json({ success: true, data: cuttings });
  } catch (error) {
    respondError(res, error);
  }
});
router2.post("/", async (req, res) => {
  try {
    const parsed = createCuttingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const cutting = await cuttingService.createCutting(
      req.params.sheetId,
      parsed.data,
      req.user.id
    );
    res.status(201).json({ success: true, data: cutting });
  } catch (error) {
    respondError(res, error);
  }
});
router2.patch("/:id/position", async (req, res) => {
  try {
    const parsed = updatePositionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const updated = await cuttingService.updateCuttingPosition(
      req.params.id,
      req.params.sheetId,
      parsed.data
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    respondError(res, error);
  }
});
router2.patch("/:id", async (req, res) => {
  try {
    const parsed = updateCuttingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const cutting = await cuttingService.updateCutting(
      req.params.id,
      req.params.sheetId,
      parsed.data
    );
    res.json({ success: true, data: cutting });
  } catch (error) {
    respondError(res, error);
  }
});
router2.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    await cuttingService.deleteCutting(req.params.id, req.params.sheetId);
    res.json({ success: true, data: { message: "Cutting removed" } });
  } catch (error) {
    respondError(res, error);
  }
});
var cuttingRoutes = router2;

// src/routes/group.routes.ts
import { Router as Router3 } from "express";

// src/services/group.service.ts
import { eq as eq3, desc as desc2, sql as sql2, inArray as inArray2 } from "drizzle-orm";
var GroupService = class {
  /**
   * List all sheet groups with their item counts.
   */
  async listGroups() {
    const groups = await db.select().from(sheetGroups).orderBy(sql2`is_pinned DESC, last_opened_at DESC NULLS LAST, created_at DESC`);
    if (groups.length === 0) return [];
    const counts = await db.select({ groupId: sheetGroupItems.groupId, count: sql2`count(*)::int` }).from(sheetGroupItems).where(inArray2(sheetGroupItems.groupId, groups.map((g) => g.id))).groupBy(sheetGroupItems.groupId);
    const countMap = new Map(counts.map((c) => [c.groupId, c.count]));
    return groups.map((group) => ({
      ...group,
      itemCount: countMap.get(group.id) ?? 0
    }));
  }
  /**
   * Get a group by ID, including its associated sheets (with cuttingCount).
   */
  async getGroupById(id) {
    const group = await db.query.sheetGroups.findFirst({
      where: eq3(sheetGroups.id, id)
    });
    if (!group) return null;
    db.update(sheetGroups).set({ lastOpenedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq3(sheetGroups.id, id)).execute().catch((e) => console.error("group lastOpenedAt update failed:", e));
    const items = await db.select().from(sheetGroupItems).where(eq3(sheetGroupItems.groupId, id)).orderBy(sheetGroupItems.createdAt);
    const sheetIds = items.map((item) => item.sheetId);
    let sheets = [];
    if (sheetIds.length > 0) {
      sheets = await db.select().from(masterSheets).where(inArray2(masterSheets.id, sheetIds)).orderBy(desc2(masterSheets.createdAt));
      await sheetService.attachCuttingCounts(sheets);
    }
    return { ...group, sheets };
  }
  /**
   * Create a new sheet group (atomic; sheetIds de-duplicated).
   */
  async createGroup(data) {
    const uniqueSheetIds = [...new Set(data.sheetIds ?? [])];
    const groupId = await db.transaction(async (tx) => {
      const [group] = await tx.insert(sheetGroups).values({ name: data.name, description: data.description ?? null }).returning();
      if (uniqueSheetIds.length > 0) {
        await tx.insert(sheetGroupItems).values(uniqueSheetIds.map((sheetId) => ({ groupId: group.id, sheetId })));
      }
      return group.id;
    });
    return this.getGroupById(groupId);
  }
  /**
   * Update a group (rename, toggle pin, replace sheet list) atomically.
   */
  async updateGroup(id, data) {
    await db.transaction(async (tx) => {
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (data.name !== void 0) updateData.name = data.name;
      if (data.description !== void 0) updateData.description = data.description;
      if (data.isPinned !== void 0) updateData.isPinned = data.isPinned;
      await tx.update(sheetGroups).set(updateData).where(eq3(sheetGroups.id, id));
      if (data.sheetIds !== void 0) {
        await tx.delete(sheetGroupItems).where(eq3(sheetGroupItems.groupId, id));
        const uniqueSheetIds = [...new Set(data.sheetIds)];
        if (uniqueSheetIds.length > 0) {
          await tx.insert(sheetGroupItems).values(uniqueSheetIds.map((sheetId) => ({ groupId: id, sheetId })));
        }
      }
    });
    return this.getGroupById(id);
  }
  /**
   * Delete a sheet group (atomic).
   */
  async deleteGroup(id) {
    await db.transaction(async (tx) => {
      await tx.delete(sheetGroupItems).where(eq3(sheetGroupItems.groupId, id));
      await tx.delete(sheetGroups).where(eq3(sheetGroups.id, id));
    });
  }
};
var groupService = new GroupService();

// src/routes/group.routes.ts
var router3 = Router3();
router3.use(requireAuth);
router3.get("/", async (_req, res) => {
  try {
    const groups = await groupService.listGroups();
    res.json({ success: true, data: groups });
  } catch (error) {
    respondError(res, error);
  }
});
router3.get("/:id", async (req, res) => {
  try {
    const group = await groupService.getGroupById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    respondError(res, error);
  }
});
router3.post("/", requireRole("manager"), async (req, res) => {
  try {
    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const group = await groupService.createGroup(parsed.data);
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    respondError(res, error);
  }
});
router3.patch("/:id", requireRole("manager"), async (req, res) => {
  try {
    const parsed = updateGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }
    const group = await groupService.updateGroup(req.params.id, parsed.data);
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    respondError(res, error);
  }
});
router3.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    await groupService.deleteGroup(req.params.id);
    res.json({ success: true, data: { message: "Group deleted successfully" } });
  } catch (error) {
    respondError(res, error);
  }
});
var groupRoutes = router3;

// src/routes/wms.routes.ts
import { Router as Router4 } from "express";

// src/services/wms.service.ts
function poStatus(po) {
  const totalReceived = po.items.reduce((s, i) => s + i.received_qty, 0);
  if (totalReceived === 0) return "pending";
  if (po.items.every((i) => i.received_qty >= i.expected_qty)) return "received";
  return "partial";
}
function pickStatus(list) {
  const totalPicked = list.lines.reduce((s, l) => s + l.qty_picked, 0);
  if (totalPicked === 0) return "pending";
  if (list.lines.every((l) => l.qty_picked >= l.qty_to_pick)) return "picked";
  return "partial";
}
var WmsService = class {
  orders = [];
  pickLists = [];
  bins = [];
  placements = [];
  constructor() {
    this.seed();
  }
  seed() {
    this.bins = [
      { code: "BIN-A1-S1", zone: "A", rack: "1", shelf: "1" },
      { code: "BIN-A1-S2", zone: "A", rack: "1", shelf: "2" },
      { code: "BIN-A2-S1", zone: "A", rack: "2", shelf: "1" },
      { code: "BIN-B1-S1", zone: "B", rack: "1", shelf: "1" },
      { code: "BIN-B2-S3", zone: "B", rack: "2", shelf: "3" },
      { code: "BIN-C1-S1", zone: "C", rack: "1", shelf: "1" }
    ];
    this.orders = [
      {
        id: "po1",
        po_number: "PO-2026-0148",
        supplier: "Sumber Kayu Jaya",
        expected_date: "2026-06-26T00:00:00.000Z",
        created_at: "2026-06-22T00:00:00.000Z",
        items: [
          { id: "po1-i1", sku: "PLY-18-MR", name: "Plywood 18mm MR Grade 1220\xD72440", barcode: "8991002340012", unit: "sheet", expected_qty: 40, received_qty: 0 },
          { id: "po1-i2", sku: "PLY-12-MR", name: "Plywood 12mm MR Grade 1220\xD72440", barcode: "8991002340029", unit: "sheet", expected_qty: 25, received_qty: 0 },
          { id: "po1-i3", sku: "MDF-15", name: "MDF Board 15mm 1220\xD72440", barcode: "8991002340036", unit: "sheet", expected_qty: 30, received_qty: 0 }
        ]
      },
      {
        id: "po2",
        po_number: "PO-2026-0151",
        supplier: "Anugerah Panel",
        expected_date: "2026-06-27T00:00:00.000Z",
        created_at: "2026-06-23T00:00:00.000Z",
        items: [
          { id: "po2-i1", sku: "HPL-WHT", name: "HPL Sheet White Gloss 1220\xD72440", barcode: "8991557000018", unit: "sheet", expected_qty: 60, received_qty: 60 },
          { id: "po2-i2", sku: "EDGE-PVC-2", name: "PVC Edge Banding 2mm (roll)", barcode: "8991557000025", unit: "roll", expected_qty: 12, received_qty: 12 }
        ]
      },
      {
        id: "po3",
        po_number: "PO-2026-0155",
        supplier: "Mega Particle Board",
        expected_date: "2026-06-28T00:00:00.000Z",
        created_at: "2026-06-24T00:00:00.000Z",
        items: [
          { id: "po3-i1", sku: "PB-16", name: "Particle Board 16mm 1220\xD72440", barcode: "8993005120011", unit: "sheet", expected_qty: 50, received_qty: 20 },
          { id: "po3-i2", sku: "PB-18", name: "Particle Board 18mm 1220\xD72440", barcode: "8993005120028", unit: "sheet", expected_qty: 50, received_qty: 0 }
        ]
      }
    ];
    this.pickLists = [
      {
        id: "pk1",
        reference: "SO-2026-0312",
        customer: "Cahaya Furniture",
        created_at: "2026-06-24T00:00:00.000Z",
        lines: [
          { id: "pk1-l1", sku: "PLY-18-MR", name: "Plywood 18mm MR Grade", barcode: "8991002340012", bin_code: "BIN-A1-S1", qty_to_pick: 10, qty_picked: 0 },
          { id: "pk1-l2", sku: "HPL-WHT", name: "HPL Sheet White Gloss", barcode: "8991557000018", bin_code: "BIN-B1-S1", qty_to_pick: 8, qty_picked: 0 }
        ]
      },
      {
        id: "pk2",
        reference: "SO-2026-0315",
        customer: "Interior Kita",
        created_at: "2026-06-24T00:00:00.000Z",
        lines: [
          { id: "pk2-l1", sku: "MDF-15", name: "MDF Board 15mm", barcode: "8991002340036", bin_code: "BIN-A2-S1", qty_to_pick: 12, qty_picked: 12 },
          { id: "pk2-l2", sku: "PB-16", name: "Particle Board 16mm", barcode: "8993005120011", bin_code: "BIN-C1-S1", qty_to_pick: 6, qty_picked: 2 }
        ]
      }
    ];
    this.placements = [
      { id: "pl-seed-1", sku: "HPL-WHT", name: "HPL Sheet White Gloss 1220\xD72440", barcode: "8991557000018", qty: 60, source_po: "PO-2026-0151", bin_code: null },
      { id: "pl-seed-2", sku: "EDGE-PVC-2", name: "PVC Edge Banding 2mm (roll)", barcode: "8991557000025", qty: 12, source_po: "PO-2026-0151", bin_code: "BIN-B2-S3" }
    ];
  }
  // ----- reads -----
  listPurchaseOrders() {
    return this.orders.map((o) => ({ ...o, status: poStatus(o) }));
  }
  getPurchaseOrder(id) {
    const o = this.orders.find((x) => x.id === id);
    return o ? { ...o, status: poStatus(o) } : null;
  }
  listPickLists() {
    return this.pickLists.map((l) => ({ ...l, status: pickStatus(l) }));
  }
  getPickList(id) {
    const l = this.pickLists.find((x) => x.id === id);
    return l ? { ...l, status: pickStatus(l) } : null;
  }
  listBins() {
    return this.bins;
  }
  listPlacements() {
    return this.placements;
  }
  // ----- receiving -----
  // TODO(db): UPDATE po_items SET received_qty = received_qty + 1 WHERE ...
  receiveByBarcode(poId, rawCode) {
    const order = this.orders.find((o) => o.id === poId);
    if (!order) return { ok: false, message: "Purchase order not found" };
    const code = (rawCode || "").trim();
    const item = order.items.find((i) => i.barcode === code);
    if (!item) return { ok: false, message: `Barcode "${code}" is not on this PO` };
    if (item.received_qty >= item.expected_qty) {
      return { ok: false, message: `${item.sku} already fully received` };
    }
    item.received_qty += 1;
    this.ensurePlacement(order, item);
    return { ok: true, message: `${item.sku} received  \xB7  ${item.received_qty}/${item.expected_qty}` };
  }
  receiveLineFully(poId, itemId) {
    const order = this.orders.find((o) => o.id === poId);
    const item = order?.items.find((i) => i.id === itemId);
    if (!order || !item) return { ok: false, message: "Item not found" };
    if (item.received_qty >= item.expected_qty) {
      return { ok: false, message: `${item.sku} already fully received` };
    }
    item.received_qty = item.expected_qty;
    this.ensurePlacement(order, item);
    return { ok: true, message: `${item.sku} fully received` };
  }
  ensurePlacement(order, item) {
    if (item.received_qty < item.expected_qty) return;
    const id = `pl-${order.id}-${item.id}`;
    if (this.placements.some((p) => p.id === id)) return;
    this.placements.push({
      id,
      sku: item.sku,
      name: item.name,
      barcode: item.barcode,
      qty: item.received_qty,
      source_po: order.po_number,
      bin_code: null
    });
  }
  // ----- picking -----
  pickByBarcode(listId, rawCode) {
    const list = this.pickLists.find((l) => l.id === listId);
    if (!list) return { ok: false, message: "Pick list not found" };
    const code = (rawCode || "").trim();
    const line = list.lines.find((l) => l.barcode === code);
    if (!line) return { ok: false, message: `Barcode "${code}" is not on this pick list` };
    if (line.qty_picked >= line.qty_to_pick) {
      return { ok: false, message: `${line.sku} already fully picked` };
    }
    line.qty_picked += 1;
    return { ok: true, message: `${line.sku} picked  \xB7  ${line.qty_picked}/${line.qty_to_pick}  \xB7  ${line.bin_code}` };
  }
  pickLineFully(listId, lineId) {
    const list = this.pickLists.find((l) => l.id === listId);
    const line = list?.lines.find((l) => l.id === lineId);
    if (!list || !line) return { ok: false, message: "Pick line not found" };
    if (line.qty_picked >= line.qty_to_pick) {
      return { ok: false, message: `${line.sku} already fully picked` };
    }
    line.qty_picked = line.qty_to_pick;
    return { ok: true, message: `${line.sku} fully picked` };
  }
  // ----- placement -----
  placeByBarcode(itemId, locationCode) {
    const item = this.placements.find((p) => p.id === itemId);
    if (!item) return { ok: false, message: "Item not found" };
    const bin = this.bins.find((b) => b.code.toUpperCase() === (locationCode || "").trim().toUpperCase());
    if (!bin) return { ok: false, message: `Unknown location tag "${locationCode}"` };
    item.bin_code = bin.code;
    return { ok: true, message: `${item.sku} placed at Rack ${bin.rack} - Shelf ${bin.shelf}` };
  }
};
var wmsService = new WmsService();
console.warn(
  "[WMS] state is in-memory (non-persistent, single-process). See migration 0002 to enable Postgres persistence."
);

// src/routes/wms.routes.ts
var router4 = Router4();
router4.use(requireAuth);
function sendScanResult(res, result) {
  if (result.ok) return res.json({ success: true, message: result.message });
  return res.status(400).json({ success: false, error: result.message });
}
router4.get("/purchase-orders", (_req, res) => {
  try {
    res.json({ success: true, data: wmsService.listPurchaseOrders() });
  } catch (e) {
    respondError(res, e);
  }
});
router4.get("/purchase-orders/:id", (req, res) => {
  try {
    const po = wmsService.getPurchaseOrder(req.params.id);
    if (!po) return res.status(404).json({ success: false, error: "Purchase order not found" });
    res.json({ success: true, data: po });
  } catch (e) {
    respondError(res, e);
  }
});
router4.post("/purchase-orders/:id/receive", (req, res) => {
  try {
    const parsed = wmsScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    }
    sendScanResult(res, wmsService.receiveByBarcode(req.params.id, parsed.data.barcode));
  } catch (e) {
    respondError(res, e);
  }
});
router4.post(
  "/purchase-orders/:id/items/:itemId/receive-all",
  (req, res) => {
    try {
      sendScanResult(res, wmsService.receiveLineFully(req.params.id, req.params.itemId));
    } catch (e) {
      respondError(res, e);
    }
  }
);
router4.get("/pick-lists", (_req, res) => {
  try {
    res.json({ success: true, data: wmsService.listPickLists() });
  } catch (e) {
    respondError(res, e);
  }
});
router4.get("/pick-lists/:id", (req, res) => {
  try {
    const list = wmsService.getPickList(req.params.id);
    if (!list) return res.status(404).json({ success: false, error: "Pick list not found" });
    res.json({ success: true, data: list });
  } catch (e) {
    respondError(res, e);
  }
});
router4.post("/pick-lists/:id/pick", (req, res) => {
  try {
    const parsed = wmsScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    }
    sendScanResult(res, wmsService.pickByBarcode(req.params.id, parsed.data.barcode));
  } catch (e) {
    respondError(res, e);
  }
});
router4.post(
  "/pick-lists/:id/lines/:lineId/pick-all",
  (req, res) => {
    try {
      sendScanResult(res, wmsService.pickLineFully(req.params.id, req.params.lineId));
    } catch (e) {
      respondError(res, e);
    }
  }
);
router4.get("/placements", (_req, res) => {
  try {
    res.json({ success: true, data: wmsService.listPlacements() });
  } catch (e) {
    respondError(res, e);
  }
});
router4.post("/placements/:id/place", (req, res) => {
  try {
    const parsed = wmsPlaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    }
    sendScanResult(res, wmsService.placeByBarcode(req.params.id, parsed.data.locationCode));
  } catch (e) {
    respondError(res, e);
  }
});
router4.get("/bins", (_req, res) => {
  try {
    res.json({ success: true, data: wmsService.listBins() });
  } catch (e) {
    respondError(res, e);
  }
});
var wmsRoutes = router4;

// src/routes/index.ts
var router5 = Router5();
router5.use("/sheets", sheetRoutes);
router5.use("/sheets/:sheetId/cuttings", cuttingRoutes);
router5.use("/groups", groupRoutes);
router5.use("/wms", wmsRoutes);
var apiRoutes = router5;

// src/app.ts
import { sql as sql3 } from "drizzle-orm";
dns.setDefaultResultOrder("ipv4first");
var isProduction3 = process.env.NODE_ENV === "production";
function createApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    if (isProduction3) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
  app.use(
    cors({
      origin: parseAllowedOrigins(),
      credentials: true
    })
  );
  app.all("/api/auth/*", toNodeHandler(auth));
  app.use(express.json());
  app.get("/api/health", async (_req, res) => {
    try {
      await db.execute(sql3`SELECT 1`);
      res.json({
        status: "ok",
        database: "connected",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("Database health check failed:", err);
      res.status(500).json({
        status: "error",
        database: "failed",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.use("/api/v1", apiRoutes);
  app.use(
    (err, _req, res, _next) => {
      console.error("Unhandled error:", err);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  );
  return app;
}

// src/serverless.ts
var cachedApp = null;
var initError = null;
function getApp() {
  if (cachedApp) return cachedApp;
  if (initError) return null;
  try {
    cachedApp = createApp();
    return cachedApp;
  } catch (err) {
    initError = err;
    return null;
  }
}
function handler(req, res) {
  const app = getApp();
  if (!app) {
    const message = initError?.message ?? String(initError ?? "unknown error");
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "server_init_failed", message }));
    return;
  }
  return new Promise((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    app(req, res);
  });
}
export {
  handler as default
};
