// ============================================================
// PHH Inventory — Sheet Routes
// ============================================================

import { Router, type Request } from "express";

type IdParams = { id: string };
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { sheetService } from "../services/sheet.service.js";
import { createSheetSchema, updateSheetSchema, createSonSheetSchema } from "@phh/shared";

const router = Router();

// All sheet routes require authentication
router.use(requireAuth);

/**
 * GET /sheets — List all sheets (any role)
 * Query params: page, limit, search, status, thickness, minLength, minWidth
 */
router.get("/", async (req, res) => {
  try {
    const { page, limit, search, status, thickness, minLength, minWidth } = req.query;
    const result = await sheetService.listSheets({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
      thickness: thickness ? Number(thickness) : undefined,
      minLength: minLength ? Number(minLength) : undefined,
      minWidth: minWidth ? Number(minWidth) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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

    const sheet = await sheetService.createSheet(
      parsed.data,
      (req as any).user.id
    );
    res.status(201).json({ success: true, data: sheet });
  } catch (error: any) {
    if (error.message?.includes("unique")) {
      return res.status(409).json({
        success: false,
        error: "Sheet number already exists",
      });
    }
    res.status(500).json({ success: false, error: error.message });
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

    const sonSheet = await sheetService.createSonSheet(
      req.params.id,
      parsed.data,
      (req as any).user.id
    );
    res.status(201).json({ success: true, data: sonSheet });
  } catch (error: any) {
    if (error.message?.includes("unique")) {
      return res.status(409).json({
        success: false,
        error: "Sheet number already exists",
      });
    }
    if (error.message?.includes("not found")) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /sheets/:id — Archive sheet (manager only)
 */
router.delete("/:id", requireRole("manager"), async (req: Request<IdParams>, res) => {
  try {
    await sheetService.archiveSheet(req.params.id);
    res.json({ success: true, data: { message: "Sheet archived" } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export const sheetRoutes: Router = router;
