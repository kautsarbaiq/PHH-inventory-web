// ============================================================
// PHH Inventory — Shared Constants
// ============================================================

/** User roles for RBAC */
export const USER_ROLES = {
  OPERATOR: "operator",
  MANAGER: "manager",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Cutting shape types */
export const CUTTING_TYPES = {
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  TRIANGLE: "triangle",
} as const;

export type CuttingType = (typeof CUTTING_TYPES)[keyof typeof CUTTING_TYPES];

/** Sheet status */
export const SHEET_STATUS = {
  ACTIVE: "active",
  DEPLETED: "depleted",
  ARCHIVED: "archived",
} as const;

export type SheetStatus = (typeof SHEET_STATUS)[keyof typeof SHEET_STATUS];

/** Default kerf allowance in mm */
export const DEFAULT_KERF_ALLOWANCE = 2;

/** Grid snap size in mm (for canvas) */
export const GRID_SNAP_SIZE = 10;

/** Minimum cut dimension in mm */
export const MIN_CUT_DIMENSION = 5;
