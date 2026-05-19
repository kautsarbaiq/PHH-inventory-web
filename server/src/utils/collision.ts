// ============================================================
// PHH Inventory — Server-Side Collision Detection (AABB)
// ============================================================

import type { BoundingBox, CuttingDimensions, ValidationResult } from "@phh/shared";

/**
 * Get the AABB bounding box for a shape, accounting for rotation.
 * For rotated rectangles, the bounding box expands using trig.
 */
export function getBoundingBox(
  type: string,
  dimensions: CuttingDimensions,
  posX: number,
  posY: number,
  rotation: number = 0,
  kerfMargin: number = 0
): BoundingBox {
  const rad = (rotation * Math.PI) / 180;
  const cosR = Math.abs(Math.cos(rad));
  const sinR = Math.abs(Math.sin(rad));

  let halfW: number;
  let halfH: number;

  switch (type) {
    case "rectangle": {
      const d = dimensions as { length: number; width: number };
      // Rotated rectangle bounding box
      halfW = (d.length * cosR + d.width * sinR) / 2;
      halfH = (d.length * sinR + d.width * cosR) / 2;
      break;
    }
    case "circle": {
      const d = dimensions as { radius: number };
      // Circle BB is rotation-invariant
      halfW = d.radius;
      halfH = d.radius;
      break;
    }
    case "triangle": {
      const d = dimensions as { base: number; height: number };
      // Simplified: use enclosing rectangle of triangle, then rotate
      halfW = (d.base * cosR + d.height * sinR) / 2;
      halfH = (d.base * sinR + d.height * cosR) / 2;
      break;
    }
    default:
      throw new Error(`Unknown cutting type: ${type}`);
  }

  // Add kerf margin (half kerf on each side)
  halfW += kerfMargin / 2;
  halfH += kerfMargin / 2;

  return {
    x1: posX - halfW,
    y1: posY - halfH,
    x2: posX + halfW,
    y2: posY + halfH,
  };
}

/**
 * Check if two bounding boxes overlap.
 */
export function checkOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
}

/**
 * Check if a bounding box is fully within the sheet boundaries.
 */
export function checkWithinSheet(
  bb: BoundingBox,
  sheetLength: number,
  sheetWidth: number
): boolean {
  return bb.x1 >= 0 && bb.y1 >= 0 && bb.x2 <= sheetLength && bb.y2 <= sheetWidth;
}

interface ExistingCutting {
  cuttingType: string;
  dimensions: CuttingDimensions;
  positionX: number;
  positionY: number;
  rotation: number;
}

/**
 * Get center position of a shape for AABB calculation.
 * Konva positions shapes at top-left, but AABB needs center.
 */
export function getCenterFromTopLeft(
  type: string,
  dims: any,
  topLeftX: number,
  topLeftY: number
): { centerX: number; centerY: number } {
  switch (type) {
    case "rectangle": {
      const d = dims as { length: number; width: number };
      return {
        centerX: topLeftX + d.length / 2,
        centerY: topLeftY + d.width / 2,
      };
    }
    case "circle": {
      return {
        centerX: topLeftX,
        centerY: topLeftY,
      };
    }
    case "triangle": {
      const d = dims as { base: number; height: number };
      return {
        centerX: topLeftX + d.base / 2,
        centerY: topLeftY + d.height / 2,
      };
    }
    default:
      return { centerX: topLeftX, centerY: topLeftY };
  }
}

/**
 * Validate that a new cutting placement is valid:
 * 1. Within sheet boundaries
 * 2. No overlap with existing cuttings
 */
export function validatePlacement(
  sheetLength: number,
  sheetWidth: number,
  kerfAllowance: number,
  existingCuttings: ExistingCutting[],
  newCutting: {
    cuttingType: string;
    dimensions: CuttingDimensions;
    positionX: number;
    positionY: number;
    rotation: number;
  }
): ValidationResult {
  const errors: string[] = [];

  const { centerX, centerY } = getCenterFromTopLeft(
    newCutting.cuttingType,
    newCutting.dimensions,
    newCutting.positionX,
    newCutting.positionY
  );

  // Get bounding box for the new cutting (with kerf margin)
  const newBB = getBoundingBox(
    newCutting.cuttingType,
    newCutting.dimensions,
    centerX,
    centerY,
    newCutting.rotation,
    kerfAllowance
  );

  // 1. Bounds check
  if (!checkWithinSheet(newBB, sheetLength, sheetWidth)) {
    errors.push(
      `Cutting exceeds sheet boundary. ` +
      `BB: [${newBB.x1.toFixed(1)}, ${newBB.y1.toFixed(1)}] to ` +
      `[${newBB.x2.toFixed(1)}, ${newBB.y2.toFixed(1)}], ` +
      `Sheet: [0, 0] to [${sheetLength}, ${sheetWidth}]`
    );
  }

  // 2. Overlap check against all existing cuttings
  for (const existing of existingCuttings) {
    const { centerX: existCX, centerY: existCY } = getCenterFromTopLeft(
      existing.cuttingType,
      existing.dimensions,
      existing.positionX,
      existing.positionY
    );

    const existingBB = getBoundingBox(
      existing.cuttingType,
      existing.dimensions,
      existCX,
      existCY,
      existing.rotation,
      kerfAllowance
    );

    if (checkOverlap(newBB, existingBB)) {
      errors.push(
        `Cutting overlaps with existing cut at ` +
        `(${existing.positionX}, ${existing.positionY})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

