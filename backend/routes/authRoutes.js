import express from "express";
import { loginUser, createUser, getProfile, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Login user
router.post("/login", loginUser);

// Admin create user
router.post("/create-user", protect, authorizeRoles("admin"), createUser);

// Get logged-in user profile
router.get("/profile", protect, getProfile);
router.get("/me", protect, getMe);

export default router;
