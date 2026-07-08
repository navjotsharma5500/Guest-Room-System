import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAdminWebsiteContent,
  getPublicWebsiteContent,
  getPublicWebsiteSection,
  publishWebsiteSection,
  resetWebsiteSection,
  seedDefaultWebsiteContent,
  updateWebsiteSection,
} from "../controllers/websiteContentController.js";

const router = express.Router();

router.get("/public", getPublicWebsiteContent);
router.get("/public/:section", getPublicWebsiteSection);

router.get("/admin", protect, getAdminWebsiteContent);
router.put("/:section", protect, updateWebsiteSection);
router.post("/seed-defaults", protect, seedDefaultWebsiteContent);
router.post("/:section/publish", protect, publishWebsiteSection);
router.post("/:section/reset", protect, resetWebsiteSection);

export default router;
