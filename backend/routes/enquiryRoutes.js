import express from "express";
import { createEnquiry, getEnquiries } from "../controllers/enquiryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Anyone can submit enquiry
router.post("/create", createEnquiry);

// Only admin can view enquiries
router.get("/", protect, authorizeRoles("admin"), getEnquiries);

export default router;
