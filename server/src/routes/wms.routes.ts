// ============================================================
// PHH Inventory — WMS Routes (Receiving / Picking / Placement)
//
// Kept for a future web-based WMS. All routes require a valid session
// (requireAuth), mutation bodies are validated with shared Zod schemas, and
// responses use the same { success, data | message | error } envelope as the
// rest of the API. State is still in-memory (see wms.service.ts) — persistence
// to Postgres via migration 0002 is the next step.
// ============================================================

import { Router, type Request } from "express";
import { wmsScanSchema, wmsPlaceSchema } from "@phh/shared";
import { requireAuth } from "../middleware/auth.middleware.js";
import { wmsService, type ScanResult } from "../services/wms.service.js";
import { respondError } from "../utils/http-error.js";
import type { Response } from "express";

const router = Router();

// All WMS routes require a signed-in user (receiving/picking are staff actions).
router.use(requireAuth);

/** Map a service ScanResult onto the shared response envelope. */
function sendScanResult(res: Response, result: ScanResult) {
  if (result.ok) return res.json({ success: true, message: result.message });
  return res.status(400).json({ success: false, error: result.message });
}

// ---- Receiving ----
router.get("/purchase-orders", (_req, res) => {
  try {
    res.json({ success: true, data: wmsService.listPurchaseOrders() });
  } catch (e) {
    respondError(res, e);
  }
});

router.get("/purchase-orders/:id", (req: Request<{ id: string }>, res) => {
  try {
    const po = wmsService.getPurchaseOrder(req.params.id);
    if (!po) return res.status(404).json({ success: false, error: "Purchase order not found" });
    res.json({ success: true, data: po });
  } catch (e) {
    respondError(res, e);
  }
});

router.post("/purchase-orders/:id/receive", (req: Request<{ id: string }>, res) => {
  try {
    const parsed = wmsScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    }
    sendScanResult(res, wmsService.receiveByBarcode(req.params.id, parsed.data.barcode));
  } catch (e) {
    respondError(res, e);
  }
});

router.post(
  "/purchase-orders/:id/items/:itemId/receive-all",
  (req: Request<{ id: string; itemId: string }>, res) => {
    try {
      sendScanResult(res, wmsService.receiveLineFully(req.params.id, req.params.itemId));
    } catch (e) {
      respondError(res, e);
    }
  }
);

// ---- Picking ----
router.get("/pick-lists", (_req, res) => {
  try {
    res.json({ success: true, data: wmsService.listPickLists() });
  } catch (e) {
    respondError(res, e);
  }
});

router.get("/pick-lists/:id", (req: Request<{ id: string }>, res) => {
  try {
    const list = wmsService.getPickList(req.params.id);
    if (!list) return res.status(404).json({ success: false, error: "Pick list not found" });
    res.json({ success: true, data: list });
  } catch (e) {
    respondError(res, e);
  }
});

router.post("/pick-lists/:id/pick", (req: Request<{ id: string }>, res) => {
  try {
    const parsed = wmsScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    }
    sendScanResult(res, wmsService.pickByBarcode(req.params.id, parsed.data.barcode));
  } catch (e) {
    respondError(res, e);
  }
});

router.post(
  "/pick-lists/:id/lines/:lineId/pick-all",
  (req: Request<{ id: string; lineId: string }>, res) => {
    try {
      sendScanResult(res, wmsService.pickLineFully(req.params.id, req.params.lineId));
    } catch (e) {
      respondError(res, e);
    }
  }
);

// ---- Placement ----
router.get("/placements", (_req, res) => {
  try {
    res.json({ success: true, data: wmsService.listPlacements() });
  } catch (e) {
    respondError(res, e);
  }
});

router.post("/placements/:id/place", (req: Request<{ id: string }>, res) => {
  try {
    const parsed = wmsPlaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    }
    sendScanResult(res, wmsService.placeByBarcode(req.params.id, parsed.data.locationCode));
  } catch (e) {
    respondError(res, e);
  }
});

// ---- Bins ----
router.get("/bins", (_req, res) => {
  try {
    res.json({ success: true, data: wmsService.listBins() });
  } catch (e) {
    respondError(res, e);
  }
});

export const wmsRoutes: Router = router;
