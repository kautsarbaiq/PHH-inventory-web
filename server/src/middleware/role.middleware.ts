// ============================================================
// PHH Inventory — Role-Based Access Middleware
// ============================================================

import type { Request, Response, NextFunction } from "express";

/**
 * Middleware factory: Requires user to have one of the specified roles.
 * Must be used AFTER requireAuth middleware.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized — no user context",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden — requires one of: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}
