import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { auditAction } from "../middleware/logMiddleware.js";
import {
  getAllHostelsWithBookings,
  getPublicHostelOptions,
  getActiveHostels,
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

// PUBLIC safe hostel + guest room metadata for enquiry booking form
router.get("/public-options", getPublicHostelOptions);

// PUBLIC active hostel names for feedback/dropdowns
router.get("/", getActiveHostels);

// CREATE hostel
router.post("/", protect, createHostel);

// GET single hostel
router.get("/:id", protect, getHostel);

// UPDATE hostel - ⚠️ THIS MUST COME BEFORE DELETE
router.put("/:id", protect, updateHostel);

// DELETE hostel
router.delete("/:id", protect, deleteHostel);

// ✅ NEW ROUTES - Block/Unblock Room
const roomFields = (req) => ({
  entityType: "ROOM",
  entityId: `${req.params.hostelName}/${req.params.roomNo}`,
  hostel: req.params.hostelName,
  roomNo: req.params.roomNo,
  remarks: req.body?.blockRemarks,
});
router.put("/:hostelName/rooms/:roomNo/block", protect, auditAction("ROOM_BLOCKED", "blockRoom", "GUEST_ROOM", roomFields), blockRoom);
router.put("/:hostelName/rooms/:roomNo/unblock", protect, auditAction("ROOM_UNBLOCKED", "unblockRoom", "GUEST_ROOM", roomFields), unblockRoom);

export default router;
