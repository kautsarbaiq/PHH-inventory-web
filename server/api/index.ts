// ============================================================
// PHH Inventory — Vercel Serverless Function entry
// Exposes the Express app (pre-bundled to dist/app.js by
// `vercel-build`) as the default handler. All requests are routed
// here via vercel.json, and Express does its own path matching.
// ============================================================

import app from "../dist/app.js";

export default app;
