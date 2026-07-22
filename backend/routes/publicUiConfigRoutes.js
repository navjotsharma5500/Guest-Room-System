import express from "express";
import { getAdminPublicUiConfig, getPublicUiConfig, updatePublicUiConfig } from "../controllers/publicUiConfigController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/config", getPublicUiConfig);
router.get("/admin/config", protect, authorizeRoles("admin"), getAdminPublicUiConfig);
router.put("/admin/config", protect, authorizeRoles("admin"), updatePublicUiConfig);
router.put("/config", protect, authorizeRoles("admin"), updatePublicUiConfig);

export default router;
