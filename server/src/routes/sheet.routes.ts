// ============================================================
// PHH Inventory — Sheet Routes
// ============================================================

import { Router, type Request } from "express";

type IdParams = { id: string };
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { sheetService } from "../services/sheet.service.js";
import {
  createSheetSchema,
  updateSheetSchema,
  createSonSheetSchema,
  makeSonSchema,
} from "@phh/shared";
import { respondError } from "../utils/http-error.js";

const router = Router();

// All sheet routes require authentication
router.use(requireAuth);

/**
 * GET /sheets — List all sheets (any role)
 * Query params: page, limit, search, status, thickness, minLength, minWidth
 */
router.get("/", async (req, res) => {
  try {
    const { page, limit, search, status, excludeStatus, thickness, minLength, minWidth, isRootOnly, parentId } = req.query;
    const result = await sheetService.listSheets({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
      excludeStatus: excludeStatus as string | undefined,
      isRootOnly: isRootOnly === 'true',
      parentId: parentId as string | undefined,
      thickness: thickness ? Number(thickness) : undefined,
      minLength: minLength ? Number(minLength) : undefined,
      minWidth: minWidth ? Number(minWidth) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * POST /sheets/genealogy-batch — Get genealogy trees for multiple sheets
 */
router.post("/genealogy-batch", async (req: Request, res) => {
  try {
    const { sheetIds } = req.body;
    if (!Array.isArray(sheetIds) || sheetIds.length === 0) {
      return res.status(400).json({ success: false, error: "sheetIds must be a non-empty array" });
    }
    const trees = await sheetService.getGenealogyBatch(sheetIds);
    res.json({ success: true, data: trees });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * GET /sheets/:id — Get sheet detail (any role)
 */
router.get("/:id", async (req: Request<IdParams>, res) => {
  try {
    const sheet = await sheetService.getSheetById(req.params.id);
    if (!sheet) {
      return res.status(404).json({ success: false, error: "Sheet not found" });
    }
    res.json({ success: true, data: sheet });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * GET /sheets/:id/genealogy — Get sheet genealogy tree
 */
router.get("/:id/genealogy", async (req: Request<IdParams>, res) => {
  try {
    const tree = await sheetService.getGenealogy(req.params.id);
    if (!tree) {
      return res.status(404).json({ success: false, error: "Sheet not found" });
    }
    res.json({ success: true, data: tree });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * POST /sheets — Create new sheet (manager only)
 */
router.post("/", requireRole("manager"), async (req: Request, res) => {
  try {
    const parsed = createSheetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const sheet = await sheetService.createSheet(parsed.data, (req as any).user.id);
    res.status(201).json({ success: true, data: sheet });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * POST /sheets/:id/son — Create son sheet from remaining material (manager only)
 */
router.post("/:id/son", requireRole("manager"), async (req: Request<IdParams>, res) => {
  try {
    const parsed = createSonSheetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const sonSheet = await sheetService.createSonSheet(req.params.id, parsed.data, (req as any).user.id);
    res.status(201).json({ success: true, data: sonSheet });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * POST /sheets/:id/cuttings/:cuttingId/make-son — Create son sheet from cutting job
 */
router.post(
  "/:id/cuttings/:cuttingId/make-son",
  requireRole("manager"),
  async (req: Request<{ id: string; cuttingId: string }>, res) => {
    try {
      const parsed = makeSonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const sonSheet = await sheetService.createSonFromCutting(
        req.params.id,
        req.params.cuttingId,
        (req as any).user.id,
        parsed.data.customName
      );
      res.status(201).json({ success: true, data: sonSheet });
    } catch (error) {
      respondError(res, error);
    }
  }
);

/**
 * PATCH /sheets/:id — Update sheet (manager only)
 */
router.patch("/:id", requireRole("manager"), async (req: Request<IdParams>, res) => {
  try {
    const parsed = updateSheetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await sheetService.updateSheet(req.params.id, parsed.data);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Sheet not found" });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * DELETE /sheets/:id — Archive sheet (manager only)
 */
router.delete("/:id", requireRole("manager"), async (req: Request<IdParams>, res) => {
  try {
    await sheetService.archiveSheet(req.params.id);
    res.json({ success: true, data: { message: "Sheet archived" } });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * DELETE /sheets/:id/permanent — Permanently delete sheet (manager only)
 */
router.delete("/:id/permanent", requireRole("manager"), async (req: Request<IdParams>, res) => {
  try {
    await sheetService.deleteSheetPermanently(req.params.id);
    res.json({ success: true, data: { message: "Sheet permanently deleted" } });
  } catch (error) {
    respondError(res, error);
  }
});

export const sheetRoutes: Router = router;
