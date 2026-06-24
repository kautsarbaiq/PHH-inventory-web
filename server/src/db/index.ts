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
const caCert = process.env.DATABASE_CA_CERT; // optional PEM string

// Prefer proper certificate verification when a CA is provided.
// Falls back to encrypted-but-unverified only when no CA is configured
// (Supabase's pooler cert is not in the system trust store by default).
const sslConfig = caCert
  ? { ca: caCert, rejectUnauthorized: true }
  : isProduction || isSupabase
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(sslConfig ? { ssl: sslConfig } : {}),
});

export const db = drizzle(pool, { schema });
