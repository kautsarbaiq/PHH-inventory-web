// ============================================================
// PHH Inventory — WMS Routes (consumed by the PHH WMS mobile app)
//
// NOTE: these are intentionally public for the initial mobile integration so
// the app can connect without a login flow yet.
// TODO(auth): gate with requireAuth once the mobile app has a sign-in screen.
// ============================================================

import { Router, type Request } from "express";
import { wmsService } from "../services/wms.service.js";
import { respondError } from "../utils/http-error.js";

const router = Router();

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
    const result = wmsService.receiveByBarcode(req.params.id, req.body?.barcode ?? "");
    res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
  } catch (e) {
    respondError(res, e);
  }
});

router.post(
  "/purchase-orders/:id/items/:itemId/receive-all",
  (req: Request<{ id: string; itemId: string }>, res) => {
    try {
      const result = wmsService.receiveLineFully(req.params.id, req.params.itemId);
      res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
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
    const result = wmsService.pickByBarcode(req.params.id, req.body?.barcode ?? "");
    res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
  } catch (e) {
    respondError(res, e);
  }
});

router.post(
  "/pick-lists/:id/lines/:lineId/pick-all",
  (req: Request<{ id: string; lineId: string }>, res) => {
    try {
      const result = wmsService.pickLineFully(req.params.id, req.params.lineId);
      res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
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
    const result = wmsService.placeByBarcode(req.params.id, req.body?.locationCode ?? "");
    res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
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
