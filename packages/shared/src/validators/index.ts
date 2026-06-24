// ============================================================
// PHH Inventory — Shared Zod Validators
// ============================================================

import { z } from "zod";
import {
  CUTTING_TYPES,
  SHEET_STATUS,
  MIN_CUT_DIMENSION,
  DEFAULT_KERF_ALLOWANCE,
} from "../constants.js";

// ---- Sheet Validators ----

export const createSheetSchema = z.object({
  sheetNumber: z
    .string()
    .min(1, "Sheet number is required")
    .max(50, "Sheet number too long"),
  grade: z.string().min(1, "Grade is required"),
  supplier: z.string().min(1, "Supplier is required"),
  length: z
    .number()
    .positive("Length must be positive")
    .min(MIN_CUT_DIMENSION, `Min length is ${MIN_CUT_DIMENSION}mm`),
  width: z
    .number()
    .positive("Width must be positive")
    .min(MIN_CUT_DIMENSION, `Min width is ${MIN_CUT_DIMENSION}mm`),
  thickness: z.number().positive("Thickness must be positive"),
  density: z.number().positive("Density must be positive"),
  kerfAllowance: z
    .number()
    .nonnegative("Kerf cannot be negative")
    .default(DEFAULT_KERF_ALLOWANCE),
  notes: z.string().optional(),
});

export const updateSheetSchema = z.object({
  grade: z.string().min(1).optional(),
  supplier: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum([SHEET_STATUS.ACTIVE, SHEET_STATUS.DEPLETED, SHEET_STATUS.ARCHIVED]).optional(),
  scrapArea: z.number().nonnegative("Scrap area cannot be negative").optional(),
  usedArea: z.number().nonnegative("Used area cannot be negative").optional(),
  isManualUsage: z.boolean().optional(),
  length: z.number().positive().min(MIN_CUT_DIMENSION).optional(),
  width: z.number().positive().min(MIN_CUT_DIMENSION).optional(),
  thickness: z.number().positive().optional(),
  density: z.number().positive().optional(),
  kerfAllowance: z.number().nonnegative().optional(),
});

export const createSonSheetSchema = z.object({
  sheetNumber: z
    .string()
    .min(1, "Sheet number is required")
    .max(50, "Sheet number too long"),
  length: z
    .number()
    .positive("Length must be positive")
    .min(MIN_CUT_DIMENSION, `Min length is ${MIN_CUT_DIMENSION}mm`),
  width: z
    .number()
    .positive("Width must be positive")
    .min(MIN_CUT_DIMENSION, `Min width is ${MIN_CUT_DIMENSION}mm`),
  thickness: z.number().positive("Thickness must be positive"),
  grade: z.string().min(1).optional(),
  supplier: z.string().min(1).optional(),
  kerfAllowance: z
    .number()
    .nonnegative("Kerf cannot be negative")
    .optional(),
  notes: z.string().optional(),
});

// ---- Cutting Dimension Validators ----

const rectangleDimensionsSchema = z.object({
  length: z.number().positive().min(MIN_CUT_DIMENSION),
  width: z.number().positive().min(MIN_CUT_DIMENSION),
});

const circleDimensionsSchema = z.object({
  radius: z.number().positive().min(MIN_CUT_DIMENSION / 2),
});

const triangleDimensionsSchema = z.object({
  base: z.number().positive().min(MIN_CUT_DIMENSION),
  height: z.number().positive().min(MIN_CUT_DIMENSION),
});

export const createCuttingSchema = z
  .object({
    jobNumber: z.string().min(1, "Job number is required"),
    cuttingType: z.enum([
      CUTTING_TYPES.RECTANGLE,
      CUTTING_TYPES.CIRCLE,
      CUTTING_TYPES.TRIANGLE,
    ]),
    dimensions: z.union([
      rectangleDimensionsSchema,
      circleDimensionsSchema,
      triangleDimensionsSchema,
    ]),
    positionX: z.number().nonnegative("Position X cannot be negative"),
    positionY: z.number().nonnegative("Position Y cannot be negative"),
    rotation: z.number().min(0).max(360).default(0),
    notes: z.string().optional(),
  })
  .refine((data) => dimensionsMatchType(data.cuttingType, data.dimensions), {
    message: "Dimensions do not match cutting type",
  });

export const updatePositionSchema = z.object({
  positionX: z.number().nonnegative(),
  positionY: z.number().nonnegative(),
  rotation: z.number().min(0).max(360).optional(),
});

/** Shared helper so the create/update refine logic cannot drift. */
function dimensionsMatchType(type: string, dimensions: unknown): boolean {
  if (type === CUTTING_TYPES.RECTANGLE) {
    return !!dimensions && "length" in (dimensions as object) && "width" in (dimensions as object);
  }
  if (type === CUTTING_TYPES.CIRCLE) {
    return !!dimensions && "radius" in (dimensions as object);
  }
  if (type === CUTTING_TYPES.TRIANGLE) {
    return !!dimensions && "base" in (dimensions as object) && "height" in (dimensions as object);
  }
  return false;
}

// ---- Update Cutting (details) Validator ----

export const updateCuttingSchema = z.object({
  jobNumber: z.string().min(1, "Job number is required").optional(),
  notes: z.string().optional(),
  dimensions: z
    .union([
      rectangleDimensionsSchema,
      circleDimensionsSchema,
      triangleDimensionsSchema,
    ])
    .optional(),
});

// ---- Make Son (from cutting) Validator ----

export const makeSonSchema = z.object({
  customName: z
    .string()
    .trim()
    .min(1, "Custom name cannot be empty")
    .max(50, "Sheet number too long")
    .optional(),
});

// ---- Group Validators ----

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100, "Group name too long"),
  description: z.string().max(500).optional(),
  sheetIds: z.array(z.string().uuid("Invalid sheet id")).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPinned: z.boolean().optional(),
  sheetIds: z.array(z.string().uuid("Invalid sheet id")).optional(),
});

// ---- Type Inference ----

export type CreateSheetInput = z.infer<typeof createSheetSchema>;
export type UpdateSheetInput = z.infer<typeof updateSheetSchema>;
export type CreateSonSheetInput = z.infer<typeof createSonSheetSchema>;
export type CreateCuttingInput = z.infer<typeof createCuttingSchema>;
export type UpdateCuttingInput = z.infer<typeof updateCuttingSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type MakeSonInput = z.infer<typeof makeSonSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
