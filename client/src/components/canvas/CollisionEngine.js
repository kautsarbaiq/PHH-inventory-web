// ============================================================
// PHH Inventory — Client-Side Collision Engine (AABB)
// ============================================================

const DEG_TO_RAD = Math.PI / 180;

/**
 * Get the AABB bounding box for a shape, accounting for rotation.
 * All values in mm (world coordinates).
 *
 * @param {string} type - rectangle | circle | triangle
 * @param {object} dims - shape dimensions
 * @param {number} posX - center X in mm
 * @param {number} posY - center Y in mm
 * @param {number} rotation - degrees
 * @param {number} kerfMargin - kerf allowance in mm (added as padding)
 * @returns {{ x1: number, y1: number, x2: number, y2: number }}
 */
export function getBoundingBox(type, dims, posX, posY, rotation = 0, kerfMargin = 0) {
  const rad = rotation * DEG_TO_RAD;
  const cosR = Math.abs(Math.cos(rad));
  const sinR = Math.abs(Math.sin(rad));

  let halfW, halfH;

  switch (type) {
    case "rectangle": {
      // Rotated rectangle bounding box expands via trig
      halfW = (dims.length * cosR + dims.width * sinR) / 2;
      halfH = (dims.length * sinR + dims.width * cosR) / 2;
      break;
    }
    case "circle": {
      // Circle is rotation-invariant
      halfW = dims.radius;
      halfH = dims.radius;
      break;
    }
    case "triangle": {
      // Enclosing rectangle of isosceles triangle, then rotate
      halfW = (dims.base * cosR + dims.height * sinR) / 2;
      halfH = (dims.base * sinR + dims.height * cosR) / 2;
      break;
    }
    default:
      halfW = 0;
      halfH = 0;
  }

  // Add kerf margin (half kerf on each side)
  const margin = kerfMargin / 2;
  halfW += margin;
  halfH += margin;

  return {
    x1: posX - halfW,
    y1: posY - halfH,
    x2: posX + halfW,
    y2: posY + halfH,
  };
}

/**
 * Check if two AABBs overlap.
 */
export function checkOverlap(a, b) {
  return !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
}

/**
 * Check if a bounding box is fully within the sheet boundaries.
 */
export function checkWithinSheet(bb, sheetLength, sheetWidth) {
  return bb.x1 >= 0 && bb.y1 >= 0 && bb.x2 <= sheetLength && bb.y2 <= sheetWidth;
}

/**
 * Validate a cutting placement against the sheet and existing cuttings.
 * Returns { valid: boolean, errors: string[] }
 *
 * @param {object} sheet - { length, width, kerfAllowance }
 * @param {Array} existingCuttings - array of { cuttingType, dimensions, positionX, positionY, rotation }
 * @param {object} newCutting - { cuttingType, dimensions, positionX, positionY, rotation }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePlacement(sheet, existingCuttings, newCutting) {
  const errors = [];
  const kerf = sheet.kerfAllowance || 0;

  const newBB = getBoundingBox(
    newCutting.cuttingType,
    newCutting.dimensions,
    newCutting.positionX,
    newCutting.positionY,
    newCutting.rotation || 0,
    kerf
  );

  // 1. Bounds check
  if (!checkWithinSheet(newBB, sheet.length, sheet.width)) {
    errors.push("Shape exceeds sheet boundary");
  }

  // 2. Overlap check
  for (const existing of existingCuttings) {
    const existBB = getBoundingBox(
      existing.cuttingType,
      typeof existing.dimensions === "string"
        ? JSON.parse(existing.dimensions)
        : existing.dimensions,
      existing.positionX,
      existing.positionY,
      existing.rotation || 0,
      kerf
    );

    if (checkOverlap(newBB, existBB)) {
      errors.push("Shape overlaps with an existing cut");
      break; // One overlap is enough to invalidate
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get center position of a shape for AABB calculation.
 * Konva positions shapes at top-left, but AABB needs center.
 *
 * @param {string} type
 * @param {object} dims
 * @param {number} topLeftX - top-left X in mm
 * @param {number} topLeftY - top-left Y in mm
 * @returns {{ centerX: number, centerY: number }}
 */
export function getCenterFromTopLeft(type, dims, topLeftX, topLeftY) {
  switch (type) {
    case "rectangle":
      return {
        centerX: topLeftX + dims.length / 2,
        centerY: topLeftY + dims.width / 2,
      };
    case "circle":
      return {
        centerX: topLeftX, // circles are positioned at center
        centerY: topLeftY,
      };
    case "triangle":
      return {
        centerX: topLeftX + dims.base / 2,
        centerY: topLeftY + dims.height / 2,
      };
    default:
      return { centerX: topLeftX, centerY: topLeftY };
  }
}
