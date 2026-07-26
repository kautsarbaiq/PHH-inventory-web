// ============================================================
// PHH Inventory — Express App (factory)
// Shared by the local server (src/index.ts) and the Vercel
// serverless function (api/index.ts). Contains everything EXCEPT
// app.listen(), so the same app can be exported as a handler.
// ============================================================

import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import express, { type Express } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { apiRoutes } from "./routes/index.js";
import { parseAllowedOrigins } from "./lib/origins.js";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

const isProduction = process.env.NODE_ENV === "production";

const app: Express = express();
// Behind Vercel / any reverse proxy: trust X-Forwarded-* so secure cookies
// and req.protocol are correct.
app.set("trust proxy", true);

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

export default app;
