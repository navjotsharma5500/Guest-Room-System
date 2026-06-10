import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  cancelScheduledBroadcast,
  createBroadcast,
  getBroadcastById,
  getBroadcasts,
  getMyBroadcastNoticeById,
  getMyBroadcastNotices,
  getBroadcastStats,
  previewBroadcastRecipients,
  requireBroadcastAccess,
  sendBroadcastNow,
  updateBroadcast,
} from "../controllers/broadcastController.js";

const router = express.Router();

router.use(protect);

router.get("/notices/me", getMyBroadcastNotices);
router.get("/notices/:id", getMyBroadcastNoticeById);

router.use(requireBroadcastAccess);

router.get("/", getBroadcasts);
router.get("/stats", getBroadcastStats);
router.post("/preview", previewBroadcastRecipients);
router.post("/", createBroadcast);
router.get("/:id", getBroadcastById);
router.put("/:id", updateBroadcast);
router.post("/:id/send", sendBroadcastNow);
router.post("/:id/cancel", cancelScheduledBroadcast);

export default router;
