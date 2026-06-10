import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createGuestSupportRequest,
  getActiveSosAlerts,
  getGuestSupportMyRequests,
  getGuestSupportRoom,
  getSupportRequests,
  getSupportQrRooms,
  reopenGuestSupportRequest,
  updateSupportRequest,
} from "../controllers/guestSupportController.js";

const router = express.Router();

router.get("/room/:hostelId/:roomId", getGuestSupportRoom);
router.post("/room/:hostelId/:roomId/my-requests", getGuestSupportMyRequests);
router.post("/room/:hostelId/:roomId", createGuestSupportRequest);
router.patch("/room/:hostelId/:roomId/reopen/:type/:id", reopenGuestSupportRequest);
router.get("/qr-rooms", protect, getSupportQrRooms);
router.get("/requests", protect, getSupportRequests);
router.get("/sos/active", protect, getActiveSosAlerts);
router.patch("/requests/:type/:id", protect, updateSupportRequest);

export default router;
