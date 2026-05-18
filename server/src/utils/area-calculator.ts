// ============================================================
// PHH Inventory — Area Calculator Utility
// ============================================================

import type { CuttingDimensions } from "@phh/shared";

/**
 * Calculate cut area based on cutting type and dimensions.
 */
export function calculateCutArea(
  type: string,
  dimensions: CuttingDimensions
): number {
  switch (type) {
    case "rectangle": {
      const d = dimensions as { length: number; width: number };
      return d.length * d.width;
    }
    case "circle": {
      const d = dimensions as { radius: number };
      return Math.PI * d.radius * d.radius;
    }
    case "triangle": {
      const d = dimensions as { base: number; height: number };
      return 0.5 * d.base * d.height;
    }
    default:
      throw new Error(`Unknown cutting type: ${type}`);
  }
}

/**
 * Calculate perimeter for kerf calculation.
 */
export function calculatePerimeter(
  type: string,
  dimensions: CuttingDimensions
): number {
  switch (type) {
    case "rectangle": {
      const d = dimensions as { length: number; width: number };
      return 2 * (d.length + d.width);
    }
    case "circle": {
      const d = dimensions as { radius: number };
      return 2 * Math.PI * d.radius;
    }
    case "triangle": {
      const d = dimensions as { base: number; height: number };
      // Isosceles triangle approximation:
      // two equal sides = sqrt((base/2)² + height²)
      const halfBase = d.base / 2;
      const side = Math.sqrt(halfBase * halfBase + d.height * d.height);
      return d.base + 2 * side;
    }
    default:
      throw new Error(`Unknown cutting type: ${type}`);
  }
}

/**
 * Calculate effective area = cut area + (perimeter × kerf allowance).
 * This accounts for the material consumed by the cutting tool.
 */
export function calculateEffectiveArea(
  type: string,
  dimensions: CuttingDimensions,
  kerfAllowance: number
): number {
  const cutArea = calculateCutArea(type, dimensions);
  const perimeter = calculatePerimeter(type, dimensions);
  return cutArea + perimeter * kerfAllowance;
}
