import express from "express";
import {
  createEnquiry,
  getEnquiries,
  approveEnquiry,
  rejectEnquiry
} from "../controllers/enquiryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Anyone can submit enquiry
router.post("/create", createEnquiry);

// Only admin can view enquiries
router.get("/", protect, authorizeRoles("admin", "Manager"), getEnquiries);

// Approve enquiry
router.put("/:id/approve", protect, authorizeRoles("admin", "Manager"), approveEnquiry);

// Reject enquiry
router.put("/:id/reject", protect, authorizeRoles("admin", "Manager"), rejectEnquiry);

export default router;
