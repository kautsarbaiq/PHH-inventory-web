// ============================================================
// PHH Inventory — Auth Middleware (Session Verification)
// ============================================================

import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

/**
 * Middleware: Requires a valid session.
 * Attaches `req.user` and `req.session` for downstream handlers.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized — please sign in",
      });
    }

    // Attach to request for downstream use
    (req as any).user = session.user;
    (req as any).session = session.session;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Session validation failed",
    });
  }
}
