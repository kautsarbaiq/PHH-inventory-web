// ============================================================
// PHH Inventory — Sheet Group Routes
// ============================================================

import { Router, type Request } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { groupService } from "../services/group.service.js";

const router = Router();

// All group routes require authentication
router.use(requireAuth);

/**
 * GET /groups — List all groups
 */
router.get("/", async (req, res) => {
  try {
    const groups = await groupService.listGroups();
    res.json({ success: true, data: groups });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /groups — Create a new sheet group (manager only)
 */
router.post("/", requireRole("manager"), async (req, res) => {
  try {
    const { name, description, sheetIds } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, error: "Name is required" });
    }
    const group = await groupService.createGroup({ name, description, sheetIds });
    res.status(201).json({ success: true, data: group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /groups/:id — Update a group (pin, rename, items) (manager only)
 */
router.patch("/:id", requireRole("manager"), async (req, res) => {
  try {
    const { name, description, isPinned, sheetIds } = req.body;
    const group = await groupService.updateGroup(req.params.id as string, {
      name,
      description,
      isPinned,
      sheetIds,
    });
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }
    res.json({ success: true, data: group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /groups/:id — Delete a group permanently (manager only)
 */
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    await groupService.deleteGroup(req.params.id as string);
    res.json({ success: true, data: { message: "Group deleted successfully" } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export const groupRoutes: Router = router;
