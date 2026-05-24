// ============================================================
// PHH Inventory — Express Server Entry Point
// ============================================================

import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { apiRoutes } from "./routes/index.js";

const app = express();
app.set("trust proxy", true);
const PORT = process.env.PORT || 3001;

// ---- Parse CORS origins from env ----
const parseCorsOrigins = (): string[] => {
  const env = process.env.CORS_ORIGIN || process.env.CLIENT_URL;
  const defaults = ["http://localhost:5173"];
  if (!env) return defaults;
  const origins = env.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
  return [...new Set([...origins, ...defaults])];
};

app.use(
  cors({
    origin: parseCorsOrigins(),
    credentials: true,
  })
);

import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

// ---- Better Auth handler MUST be BEFORE express.json() ----
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

// ---- Health Check ----
app.get("/api/health", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Database health check failed:", err);
    res.status(500).json({
      status: "error",
      database: "failed",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ---- API Routes ----
app.use("/api/v1", apiRoutes);

// ---- Error Handler ----
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`🏭 PHH Inventory Server running on http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api/v1`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
});
