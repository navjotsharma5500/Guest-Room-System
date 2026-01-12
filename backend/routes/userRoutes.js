import express from "express";
import {
  getUsers,
  updateUser,
  deleteUser,
  changePasswordForCurrentUser
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get all users (admin only)
router.get("/", protect, authorizeRoles("admin"), getUsers);

// Change password (logged-in user)
router.put("/change-password", protect, changePasswordForCurrentUser);

// Update user (admin)
router.put("/:id", protect, authorizeRoles("admin"), updateUser);

// Delete user (admin)
router.delete("/:id", protect, authorizeRoles("admin"), deleteUser);

export default router;
