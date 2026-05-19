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

// ---- Better Auth handler MUST be BEFORE express.json() ----
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

// ---- Health Check ----
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
