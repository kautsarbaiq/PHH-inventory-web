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
import { parseAllowedOrigins } from "./lib/origins.js";

const app = express();
app.set("trust proxy", true);
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

// ---- Baseline security headers (lightweight, no helmet dependency) ----
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(
  cors({
    origin: parseAllowedOrigins(),
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
