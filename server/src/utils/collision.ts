// ============================================================
// PHH Inventory — Collision Detection (re-exported from @phh/shared)
// The canonical implementation lives in packages/shared/src/geometry.ts
// so the client and server can never drift.
// ============================================================

export {
  getBoundingBox,
  checkOverlap,
  checkWithinSheet,
  getCenterFromTopLeft,
  validatePlacement,
} from "@phh/shared";
