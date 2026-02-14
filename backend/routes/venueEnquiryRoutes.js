import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createVenueEnquiry,
  getVenueSocietySuggestions,
  getVenueEventSuggestions,
  getAllVenueEnquiries,
  getVenueEnquiryById,
  approveVenueEnquiry,
  rejectVenueEnquiry,
} from "../controllers/venueEnquiryController.js";

const router = express.Router();

// Middleware for admin/assistant/dd_assistant only
const adminAssistantOnly = (req, res, next) => {
  if (!['admin', 'assistant', 'dd_assistant'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Admin, Assistant, or DD Assistant role required' });
  }
  next();
};

// Public submit endpoint
router.post("/create", createVenueEnquiry);
// Backward/alternate submit endpoint
router.post("/", createVenueEnquiry);
// Public society suggestions for venue forms
router.get("/society-suggestions", getVenueSocietySuggestions);
// Public event suggestions for venue forms
router.get("/event-suggestions", getVenueEventSuggestions);

// Admin/Assistant endpoints
router.get("/all", protect, getAllVenueEnquiries);
router.get("/:id", protect, getVenueEnquiryById);
router.put("/:id/approved", protect, approveVenueEnquiry);
router.put("/:id/rejected", protect, rejectVenueEnquiry);

export default router;
