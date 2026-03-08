import express from "express";
import { getPublicUiConfig, updatePublicUiConfig } from "../controllers/publicUiConfigController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/config", getPublicUiConfig);
router.put("/config", protect, authorizeRoles("admin"), updatePublicUiConfig);

export default router;
