// ============================================================
// PHH Inventory — Area Calculation Utilities (Client-side)
// ============================================================

/**
 * Calculate cut area based on type and dimensions.
 */
export function calculateCutArea(type, dimensions) {
  switch (type) {
    case "rectangle":
      return dimensions.length * dimensions.width;
    case "circle":
      return Math.PI * dimensions.radius * dimensions.radius;
    case "triangle":
      return 0.5 * dimensions.base * dimensions.height;
    default:
      return 0;
  }
}

/**
 * Calculate perimeter for kerf calculation.
 */
export function calculatePerimeter(type, dimensions) {
  switch (type) {
    case "rectangle":
      return 2 * (dimensions.length + dimensions.width);
    case "circle":
      return 2 * Math.PI * dimensions.radius;
    case "triangle": {
      const halfBase = dimensions.base / 2;
      const side = Math.sqrt(halfBase * halfBase + dimensions.height * dimensions.height);
      return dimensions.base + 2 * side;
    }
    default:
      return 0;
  }
}

/**
 * Format area for display (with commas and unit).
 */
export function formatArea(area) {
  return `${area.toLocaleString("en-US", { maximumFractionDigits: 1 })} mm²`;
}

/**
 * Format percentage for display.
 */
export function formatPercent(value) {
  return `${value.toFixed(1)}%`;
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
  return `${weight.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
}
