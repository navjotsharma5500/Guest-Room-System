import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { getAuditLogs } from "../controllers/auditController.js";

const router = express.Router();
router.get("/", protect, authorizeRoles("admin"), getAuditLogs);
export default router;
