// ============================================================
// PHH Inventory — Vercel Serverless Function entry
// Loads the pre-bundled Express app (dist/app.js) and drives it.
// The app is imported dynamically so that a startup error (e.g. a
// missing env var) is caught and returned as a readable JSON 500
// instead of Vercel's opaque FUNCTION_INVOCATION_FAILED page.
// ============================================================

import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  let app: (req: IncomingMessage, res: ServerResponse) => void;
  try {
    const mod = await import("../dist/app.js");
    app = mod.default as unknown as typeof app;
  } catch (err: any) {
    // Surface the real initialization error so it is debuggable from the URL.
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "server_init_failed",
        message: String(err?.message ?? err),
      })
    );
    return;
  }

  // Keep the function alive until Express finishes writing the response.
  await new Promise<void>((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    app(req, res);
  });
}
