// ============================================================
// PHH Inventory — Client Collision Engine (adapter over @phh/shared)
// The geometry itself lives in packages/shared/src/geometry.ts so the
// canvas validity indicator can never diverge from the server's
// accept/reject decision.
// ============================================================

import { validatePlacement as sharedValidatePlacement } from "@phh/shared/geometry";

export {
  getBoundingBox,
  checkOverlap,
  checkWithinSheet,
  getCenterFromTopLeft,
} from "@phh/shared/geometry";

/**
 * Client-friendly wrapper: takes a `sheet` object instead of positional
 * length/width/kerf args, matching the existing canvas call sites.
 *
 * @param {{length:number,width:number,kerfAllowance?:number}} sheet
 * @param {Array} existingCuttings
 * @param {object} newCutting
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePlacement(sheet, existingCuttings, newCutting) {
  return sharedValidatePlacement(
    sheet.length,
    sheet.width,
    sheet.kerfAllowance || 0,
    existingCuttings,
    newCutting
  );
}
