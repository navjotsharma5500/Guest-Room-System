import express from "express";
import {
  getDashboards,
  getPublicSettings,
  getSettings,
  updateDashboards,
  updateSettings,
} from "../controllers/systemSettingsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/public", getPublicSettings);
router.get("/", protect, authorizeRoles("admin"), getSettings);
router.put("/", protect, authorizeRoles("admin"), updateSettings);

router.get("/dashboards", protect, authorizeRoles("admin"), getDashboards);
router.put("/dashboards", protect, authorizeRoles("admin"), updateDashboards);

export default router;
