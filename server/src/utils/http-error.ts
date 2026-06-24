// ============================================================
// PHH Inventory — Centralized route error responder
//
// Maps known, app-generated error messages to safe HTTP status
// codes. Anything unrecognized (raw pg/Drizzle errors, etc.) is
// logged server-side and returned to the client as a generic
// "Internal server error" so DB/schema internals never leak.
// ============================================================

import type { Response } from "express";

export function respondError(res: Response, error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error ?? "");

  // 404 — not found (service throws "... not found")
  if (/not found/i.test(message)) {
    return res.status(404).json({ success: false, error: message });
  }

  // 409 — unique constraint violations
  if (/unique|duplicate key/i.test(message)) {
    return res.status(409).json({ success: false, error: "Resource already exists" });
  }

  // 400 — known business-rule / validation failures (safe to surface)
  if (
    /does not belong|not active|placement invalid|invalid position|exceeds sheet|overlaps|cannot be empty|must be|is required|cannot add|cannot exceed/i.test(
      message
    )
  ) {
    return res.status(400).json({ success: false, error: message });
  }

  // 500 — unknown/internal: log full detail, return generic message
  console.error("Unhandled route error:", error);
  return res.status(500).json({ success: false, error: "Internal server error" });
}
