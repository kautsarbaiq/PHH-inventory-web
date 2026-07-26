// ============================================================
// PHH Inventory — Serverless handler (bundled into api/index.js)
// This file is esbuild-bundled (with @phh/shared inlined) into a
// self-contained api/index.js that is committed and deployed as-is,
// so Vercel never has to build the monorepo. The app is created on
// the first request and cached; a startup failure is returned as a
// readable JSON 500 instead of an opaque function crash.
// ============================================================

import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "./app.js";

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedApp: NodeHandler | null = null;
let initError: unknown = null;

function getApp(): NodeHandler | null {
  if (cachedApp) return cachedApp;
  if (initError) return null;
  try {
    cachedApp = createApp() as unknown as NodeHandler;
    return cachedApp;
  } catch (err) {
    initError = err;
    return null;
  }
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const app = getApp();
  if (!app) {
    const message =
      (initError as any)?.message ?? String(initError ?? "unknown error");
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "server_init_failed", message }));
    return;
  }
  // Keep the function alive until Express finishes writing the response.
  return new Promise<void>((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    app(req, res);
  });
}
