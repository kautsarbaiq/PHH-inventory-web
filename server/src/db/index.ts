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

// In a serverless environment (Vercel) each warm instance keeps its own pool
// while many instances may run concurrently, so cap connections tightly and
// let idle sockets close quickly — the Supabase pgBouncer pooler multiplexes
// them upstream. Locally we allow a larger pool for a single long-lived process.
const isServerless = !!process.env.VERCEL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isServerless ? 1 : 10,
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  ...(sslConfig ? { ssl: sslConfig } : {}),
});

export const db = drizzle(pool, { schema });
