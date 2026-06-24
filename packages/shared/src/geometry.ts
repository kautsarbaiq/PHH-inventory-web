// ============================================================
// PHH Inventory — Shared Geometry (single source of truth)
//
// Area / perimeter math + AABB collision detection used by BOTH
// the server (cutting service) and the client (Konva canvas).
// Keep this the ONLY implementation — do not re-create these
// functions in client or server code.
// ============================================================

import type { BoundingBox, CuttingDimensions, ValidationResult } from "./types/index.js";

// ---- Area & Perimeter --------------------------------------

/**
 * Calculate cut area based on cutting type and dimensions.
 * Returns 0 for unknown/empty types so UI previews never crash;
 * callers that mutate the DB validate the type via Zod first.
 */
export function calculateCutArea(type: string, dimensions: CuttingDimensions): number {
  let area = 0;
  switch (type) {
    case "rectangle": {
      const d = dimensions as { length: number; width: number };
      area = d.length * d.width;
      break;
    }
    case "circle": {
      const d = dimensions as { radius: number };
      area = Math.PI * d.radius * d.radius;
      break;
    }
    case "triangle": {
      const d = dimensions as { base: number; height: number };
      area = 0.5 * d.base * d.height;
      break;
    }
    default:
      return 0;
  }
  // Guard against malformed dimensions producing NaN (would corrupt usedArea).
  return Number.isFinite(area) ? area : 0;
}

/**
 * Calculate perimeter (used for the kerf allowance).
 */
export function calculatePerimeter(type: string, dimensions: CuttingDimensions): number {
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
      // Isosceles approximation: two equal sides = sqrt((base/2)^2 + height^2)
      const halfBase = d.base / 2;
      const side = Math.sqrt(halfBase * halfBase + d.height * d.height);
      return d.base + 2 * side;
    }
    default:
      return 0;
  }
}

/**
 * Effective area = cut area + (perimeter × kerf allowance).
 * Accounts for material consumed by the cutting tool.
 */
export function calculateEffectiveArea(
  type: string,
  dimensions: CuttingDimensions,
  kerfAllowance: number
): number {
  const cutArea = calculateCutArea(type, dimensions);
  const perimeter = calculatePerimeter(type, dimensions);
  const result = cutArea + perimeter * kerfAllowance;
  return Number.isFinite(result) ? result : 0;
}

// ---- Collision (AABB) --------------------------------------

/**
 * AABB bounding box for a shape, accounting for rotation and kerf.
 * posX/posY are the shape CENTER (world mm).
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
      halfW = (d.length * cosR + d.width * sinR) / 2;
      halfH = (d.length * sinR + d.width * cosR) / 2;
      break;
    }
    case "circle": {
      const d = dimensions as { radius: number };
      halfW = d.radius;
      halfH = d.radius;
      break;
    }
    case "triangle": {
      const d = dimensions as { base: number; height: number };
      halfW = (d.base * cosR + d.height * sinR) / 2;
      halfH = (d.base * sinR + d.height * cosR) / 2;
      break;
    }
    default:
      halfW = 0;
      halfH = 0;
  }

  // Half kerf on each side
  halfW += kerfMargin / 2;
  halfH += kerfMargin / 2;

  return { x1: posX - halfW, y1: posY - halfH, x2: posX + halfW, y2: posY + halfH };
}

/** Whether two AABBs overlap. */
export function checkOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
}

/** Whether a bounding box is fully within the sheet. */
export function checkWithinSheet(bb: BoundingBox, sheetLength: number, sheetWidth: number): boolean {
  return bb.x1 >= 0 && bb.y1 >= 0 && bb.x2 <= sheetLength && bb.y2 <= sheetWidth;
}

/**
 * Convert a stored top-left position into a shape center.
 * Konva positions rectangles/triangles at top-left, but circles at center.
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
      return { centerX: topLeftX + d.length / 2, centerY: topLeftY + d.width / 2 };
    }
    case "circle":
      return { centerX: topLeftX, centerY: topLeftY };
    case "triangle": {
      const d = dims as { base: number; height: number };
      return { centerX: topLeftX + d.base / 2, centerY: topLeftY + d.height / 2 };
    }
    default:
      return { centerX: topLeftX, centerY: topLeftY };
  }
}

interface PlacementCutting {
  cuttingType: string;
  dimensions: CuttingDimensions;
  positionX: number;
  positionY: number;
  rotation: number;
}

/**
 * Validate a placement: within sheet bounds AND no overlap with existing cuts.
 * Canonical implementation used by server and (via wrapper) the client.
 */
export function validatePlacement(
  sheetLength: number,
  sheetWidth: number,
  kerfAllowance: number,
  existingCuttings: PlacementCutting[],
  newCutting: PlacementCutting
): ValidationResult {
  const errors: string[] = [];

  const { centerX, centerY } = getCenterFromTopLeft(
    newCutting.cuttingType,
    newCutting.dimensions,
    newCutting.positionX,
    newCutting.positionY
  );

  const newBB = getBoundingBox(
    newCutting.cuttingType,
    newCutting.dimensions,
    centerX,
    centerY,
    newCutting.rotation || 0,
    kerfAllowance
  );

  if (!checkWithinSheet(newBB, sheetLength, sheetWidth)) {
    errors.push(
      `Cutting exceeds sheet boundary. ` +
        `BB: [${newBB.x1.toFixed(1)}, ${newBB.y1.toFixed(1)}] to ` +
        `[${newBB.x2.toFixed(1)}, ${newBB.y2.toFixed(1)}], ` +
        `Sheet: [0, 0] to [${sheetLength}, ${sheetWidth}]`
    );
  }

  for (const existing of existingCuttings) {
    const existDims =
      typeof existing.dimensions === "string"
        ? (JSON.parse(existing.dimensions as unknown as string) as CuttingDimensions)
        : existing.dimensions;

    const { centerX: existCX, centerY: existCY } = getCenterFromTopLeft(
      existing.cuttingType,
      existDims,
      existing.positionX,
      existing.positionY
    );

    const existingBB = getBoundingBox(
      existing.cuttingType,
      existDims,
      existCX,
      existCY,
      existing.rotation || 0,
      kerfAllowance
    );

    if (checkOverlap(newBB, existingBB)) {
      errors.push(`Cutting overlaps with existing cut at (${existing.positionX}, ${existing.positionY})`);
    }
  }

  return { valid: errors.length === 0, errors };
}
