// ============================================================
// PHH Inventory — Express Server Entry Point
// ============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { apiRoutes } from "./routes/index.js";

const app = express();
app.set("trust proxy", true); // Trust Render load balancer proxy for secure cookies (HTTPS)
const PORT = process.env.PORT || 3001;

// ---- Global Middlewares ----
app.use(
  cors({
    origin: [
      "https://phh-inventory-web-client.vercel.app",
      "http://localhost:5173",
      ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.replace(/\/$/, "")] : [])
    ],
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
