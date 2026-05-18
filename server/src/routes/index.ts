// ============================================================
// PHH Inventory — Route Aggregator
// ============================================================

import { Router } from "express";
import { sheetRoutes } from "./sheet.routes.js";
import { cuttingRoutes } from "./cutting.routes.js";

const router = Router();

router.use("/sheets", sheetRoutes);
router.use("/sheets/:sheetId/cuttings", cuttingRoutes);

export const apiRoutes: Router = router;
