import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Admin dashboard data
router.get("/stats", protect, authorizeRoles("admin"), getDashboardStats);

export default router;
