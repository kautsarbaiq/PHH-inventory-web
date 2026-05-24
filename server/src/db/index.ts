// ============================================================
// PHH Inventory — Database Connection (DrizzleORM + PostgreSQL)
// ============================================================

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";
const isSupabase = (process.env.DATABASE_URL || "").includes("supabase");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isProduction || isSupabase
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

export const db = drizzle(pool, { schema });
