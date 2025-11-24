import express from "express";
import {
  createEnquiry,
  approveEnquiry,
  rejectEnquiry,
  getEnquiries,
} from "../controllers/enquiryController.js";

const router = express.Router();

// 🔥 Create enquiry
router.post("/create", createEnquiry);

// 🔥 Get all enquiries (admin dashboard)
router.get("/", getEnquiries);

// 🔥 Approve enquiry
router.put("/:id/approved", approveEnquiry);

// 🔥 Reject enquiry
router.put("/:id/rejected", rejectEnquiry);

export default router;
