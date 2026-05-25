// ============================================================
// PHH Inventory — Route Aggregator
// ============================================================

import { Router } from "express";
import { sheetRoutes } from "./sheet.routes.js";
import { cuttingRoutes } from "./cutting.routes.js";
import { groupRoutes } from "./group.routes.js";

const router = Router();

router.use("/sheets", sheetRoutes);
router.use("/sheets/:sheetId/cuttings", cuttingRoutes);
router.use("/groups", groupRoutes);

export const apiRoutes: Router = router;
