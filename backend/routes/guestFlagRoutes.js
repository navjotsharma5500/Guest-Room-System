import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  createGuestFlag,
  getGuestFlagsForBooking,
  getGuestFlagStatus,
  overrideGuestFlag,
} from "../controllers/guestFlagController.js";

const router = express.Router();

router.get("/status", protect, getGuestFlagStatus);
router.get("/guest/:bookingId", protect, getGuestFlagsForBooking);
router.post(
  "/",
  protect,
  authorizeRoles("admin", "manager", "caretaker", "warden", "Warden", "co_warden", "adosa"),
  createGuestFlag
);
router.patch("/:id/override", protect, authorizeRoles("admin"), overrideGuestFlag);

export default router;
