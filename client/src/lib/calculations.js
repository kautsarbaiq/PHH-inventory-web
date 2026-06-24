// ============================================================
// PHH Inventory — Client display helpers
// Area/perimeter math is re-exported from @phh/shared/geometry
// (single source of truth shared with the server).
// ============================================================

export {
  calculateCutArea,
  calculatePerimeter,
  calculateEffectiveArea,
} from "@phh/shared/geometry";

/**
 * Format area for display (with commas and unit).
 */
export function formatArea(area) {
  return `${(area ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1 })} mm²`;
}

/**
 * Format percentage for display.
 */
export function formatPercent(value) {
  return `${(value ?? 0).toFixed(1)}%`;
}

/**
 * Calculate weight (Berat) = density * length * width * thickness
 */
export function calculateWeight(sheet) {
  if (!sheet || !sheet.density || !sheet.length || !sheet.width || !sheet.thickness) return 0;
  return sheet.density * sheet.length * sheet.width * sheet.thickness;
}

/**
 * Format weight for display
 */
export function formatWeight(weight) {
  return `${(weight ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
}
