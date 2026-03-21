import express from "express";
import { 
  loginUser, 
  googleLogin,
  createUser, 
  getProfile, 
  getMe, 
  logoutUser,
  updateProfile,
  forgotPassword,
  resetPassword
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();
const googleAuthPaths = ["/google", "/google-login"];

// Login user
router.post("/login", loginUser);

// Google Login
for (const path of googleAuthPaths) {
  router.options(path, (req, res) => res.sendStatus(200));
  router.post(path, googleLogin);
  router.get(path, (req, res) => {
    return res.status(405).json({
      success: false,
      message: `Method not allowed. Use POST /api/auth${path} with JSON body { token }`,
    });
  });
}

// Logout user
router.post("/logout", logoutUser);

// Forgot Password
router.post("/forgot-password", forgotPassword);

// Reset Password
router.put("/reset-password/:resetToken", resetPassword);

// Admin create user
router.post("/create-user", protect, authorizeRoles("admin"), createUser);

// Get logged-in user profile
router.get("/profile", protect, getProfile);

// Update user profile
router.put("/profile", protect, updateProfile);

// Get user using cookie-auth
router.get("/me", protect, getMe);

export default router;
