import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAllHostelsWithBookings,
  createHostel,
  getHostel,
  updateHostel,
  deleteHostel,
  blockRoom,      // ✅ NEW
  unblockRoom,    // ✅ NEW
} from "../controllers/hostelController.js";

const router = express.Router();

// GET all hostels + rooms + aggregated bookings
router.get("/all", protect, getAllHostelsWithBookings);

// CREATE hostel
router.post("/", protect, createHostel);

// GET single hostel
router.get("/:id", protect, getHostel);

// UPDATE hostel - ⚠️ THIS MUST COME BEFORE DELETE
router.put("/:id", protect, updateHostel);

// DELETE hostel
router.delete("/:id", protect, deleteHostel);

// ✅ NEW ROUTES - Block/Unblock Room
router.put("/:hostelName/rooms/:roomNo/block", protect, blockRoom);
router.put("/:hostelName/rooms/:roomNo/unblock", protect, unblockRoom);

export default router;