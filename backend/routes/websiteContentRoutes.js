import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAdminWebsiteContent,
  getPublicWebsiteContent,
  getPublicWebsiteSection,
  getWebsiteSectionVersions,
  publishWebsiteSection,
  resetWebsiteSection,
  restoreWebsiteSectionVersion,
  seedDefaultWebsiteContent,
  updateWebsiteSection,
} from "../controllers/websiteContentController.js";

const router = express.Router();

router.get("/public", getPublicWebsiteContent);
router.get("/public/:section", getPublicWebsiteSection);

router.get("/admin", protect, getAdminWebsiteContent);
router.get("/:section/versions", protect, getWebsiteSectionVersions);
router.put("/:section", protect, updateWebsiteSection);
router.post("/seed-defaults", protect, seedDefaultWebsiteContent);
router.post("/:section/publish", protect, publishWebsiteSection);
router.post("/:section/reset", protect, resetWebsiteSection);
router.post("/:section/versions/:versionId/restore", protect, restoreWebsiteSectionVersion);

export default router;
