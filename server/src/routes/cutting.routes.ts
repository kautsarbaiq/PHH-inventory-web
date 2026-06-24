// ============================================================
// PHH Inventory — Cutting Routes
// ============================================================

import { Router, type Request } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { cuttingService } from "../services/cutting.service.js";
import { createCuttingSchema, updatePositionSchema, updateCuttingSchema } from "@phh/shared";
import { respondError } from "../utils/http-error.js";

const router = Router({ mergeParams: true }); // Access :sheetId from parent

// Route param types
type SheetParams = { sheetId: string };
type CuttingParams = { sheetId: string; id: string };

// All cutting routes require authentication
router.use(requireAuth);

/**
 * GET /sheets/:sheetId/cuttings — List cuttings for a sheet
 */
router.get("/", async (req: Request<SheetParams>, res) => {
  try {
    const cuttings = await cuttingService.getCuttingsBySheet(req.params.sheetId);
    res.json({ success: true, data: cuttings });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * POST /sheets/:sheetId/cuttings — Create cutting (operator+)
 */
router.post("/", async (req: Request<SheetParams>, res) => {
  try {
    const parsed = createCuttingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const cutting = await cuttingService.createCutting(
      req.params.sheetId,
      parsed.data,
      (req as any).user.id
    );
    res.status(201).json({ success: true, data: cutting });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * PATCH /sheets/:sheetId/cuttings/:id/position — Update position (drag-and-drop)
 */
router.patch("/:id/position", async (req: Request<CuttingParams>, res) => {
  try {
    const parsed = updatePositionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await cuttingService.updateCuttingPosition(
      req.params.id,
      req.params.sheetId,
      parsed.data
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * PATCH /sheets/:sheetId/cuttings/:id — Update cutting details (jobNumber, dimensions, notes)
 */
router.patch("/:id", async (req: Request<CuttingParams>, res) => {
  try {
    const parsed = updateCuttingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const cutting = await cuttingService.updateCutting(
      req.params.id,
      req.params.sheetId,
      parsed.data
    );
    res.json({ success: true, data: cutting });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * DELETE /sheets/:sheetId/cuttings/:id — Remove cutting (manager only)
 */
router.delete("/:id", requireRole("manager"), async (req: Request<CuttingParams>, res) => {
  try {
    await cuttingService.deleteCutting(req.params.id, req.params.sheetId);
    res.json({ success: true, data: { message: "Cutting removed" } });
  } catch (error) {
    respondError(res, error);
  }
});

export const cuttingRoutes: Router = router;
