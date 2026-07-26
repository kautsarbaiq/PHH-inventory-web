// ============================================================
// PHH Inventory — Local Server Entry Point
// Boots the Express app (src/app.ts) as a long-running process.
// On Vercel the same app is served from src/serverless.ts instead.
// ============================================================

import { createApp } from "./app.js";

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🏭 PHH Inventory Server running on http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api/v1`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
});
