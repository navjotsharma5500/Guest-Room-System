import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  approveCampusFeedback,
  deleteCampusFeedback,
  getCampusFeedbackAdmin,
  getApprovedCampusFeedback,
  rejectCampusFeedback,
  submitCampusFeedback,
} from "../controllers/campusFeedbackController.js";

const router = express.Router();

const requireFeedbackAuthentication = (req, res, next) => {
  const hasBearer = req.headers.authorization?.startsWith("Bearer ");
  if (!hasBearer && !req.cookies?.token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  return next();
};

router.post("/", requireFeedbackAuthentication, protect, submitCampusFeedback);
router.get("/public", getApprovedCampusFeedback);
router.get("/admin", protect, authorizeRoles("admin"), getCampusFeedbackAdmin);
router.patch("/:id/approve", protect, authorizeRoles("admin"), approveCampusFeedback);
router.patch("/:id/reject", protect, authorizeRoles("admin"), rejectCampusFeedback);
router.delete("/:id", protect, authorizeRoles("admin"), deleteCampusFeedback);

export default router;
