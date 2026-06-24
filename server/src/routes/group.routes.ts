// ============================================================
// PHH Inventory — Sheet Group Routes
// ============================================================

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { groupService } from "../services/group.service.js";
import { createGroupSchema, updateGroupSchema } from "@phh/shared";
import { respondError } from "../utils/http-error.js";

const router = Router();

// All group routes require authentication
router.use(requireAuth);

/**
 * GET /groups — List all groups
 */
router.get("/", async (_req, res) => {
  try {
    const groups = await groupService.listGroups();
    res.json({ success: true, data: groups });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * GET /groups/:id — Get details of a single group (including its sheets)
 */
router.get("/:id", async (req, res) => {
  try {
    const group = await groupService.getGroupById(req.params.id as string);
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * POST /groups — Create a new sheet group (manager only)
 */
router.post("/", requireRole("manager"), async (req, res) => {
  try {
    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const group = await groupService.createGroup(parsed.data);
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * PATCH /groups/:id — Update a group (pin, rename, items) (manager only)
 */
router.patch("/:id", requireRole("manager"), async (req, res) => {
  try {
    const parsed = updateGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const group = await groupService.updateGroup(req.params.id as string, parsed.data);
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * DELETE /groups/:id — Delete a group permanently (manager only)
 */
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    await groupService.deleteGroup(req.params.id as string);
    res.json({ success: true, data: { message: "Group deleted successfully" } });
  } catch (error) {
    respondError(res, error);
  }
});

export const groupRoutes: Router = router;
