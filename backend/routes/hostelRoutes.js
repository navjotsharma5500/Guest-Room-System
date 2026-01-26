import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAllHostelsWithBookings,
  createHostel,
  getHostel,
  updateHostel,
  deleteHostel,
} from "../controllers/hostelController.js";
import Hostel from "../models/Hostel.js";

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

// ✅ NEW: BLOCK ROOM
router.put("/:hostelName/rooms/:roomNo/block", protect, async (req, res) => {
  try {
    const { hostelName, roomNo } = req.params;
    const { blockedTill, blockRemarks, blockAttachments } = req.body;

    // Validation
    if (!blockedTill) {
      return res.status(400).json({ 
        success: false, 
        message: "Blocked till date is required" 
      });
    }

    if (!blockRemarks || !blockRemarks.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Remarks are required" 
      });
    }

    if (!Array.isArray(blockAttachments) || blockAttachments.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one attachment is required" 
      });
    }

    // Find hostel and room
    const hostel = await Hostel.findOne({ name: hostelName });
    if (!hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "Hostel not found" 
      });
    }

    const room = hostel.rooms.find(r => r.roomNo === roomNo);
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: "Room not found" 
      });
    }

    if (room.isBlocked) {
      return res.status(400).json({ 
        success: false, 
        message: "Room is already blocked" 
      });
    }

    // Update room blocking status
    room.isBlocked = true;
    room.blockedTill = new Date(blockedTill);
    room.blockRemarks = blockRemarks;
    room.blockAttachments = blockAttachments;
    room.blockedBy = req.user._id;
    room.blockedAt = new Date();

    await hostel.save();

    console.log("✅ Room blocked:", { hostelName, roomNo });

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('room-blocked', {
        hostelName,
        roomNo,
        blockedTill: room.blockedTill,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Room blocked successfully",
      room: {
        roomNo: room.roomNo,
        isBlocked: room.isBlocked,
        blockedTill: room.blockedTill,
        blockRemarks: room.blockRemarks,
        blockAttachments: room.blockAttachments
      }
    });

  } catch (err) {
    console.error("❌ BLOCK ROOM ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to block room",
      error: err.message 
    });
  }
});

// ✅ NEW: UNBLOCK ROOM
router.put("/:hostelName/rooms/:roomNo/unblock", protect, async (req, res) => {
  try {
    const { hostelName, roomNo } = req.params;

    const hostel = await Hostel.findOne({ name: hostelName });
    if (!hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "Hostel not found" 
      });
    }

    const room = hostel.rooms.find(r => r.roomNo === roomNo);
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: "Room not found" 
      });
    }

    if (!room.isBlocked) {
      return res.status(400).json({ 
        success: false, 
        message: "Room is not blocked" 
      });
    }

    // Clear blocking data
    room.isBlocked = false;
    room.blockedTill = null;
    room.blockRemarks = "";
    room.blockAttachments = [];
    room.blockedBy = null;
    room.blockedAt = null;

    await hostel.save();

    console.log("✅ Room unblocked:", { hostelName, roomNo });

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('room-unblocked', {
        hostelName,
        roomNo,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Room unblocked successfully",
      room: {
        roomNo: room.roomNo,
        isBlocked: room.isBlocked
      }
    });

  } catch (err) {
    console.error("❌ UNBLOCK ROOM ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to unblock room",
      error: err.message 
    });
  }
});

export default router;