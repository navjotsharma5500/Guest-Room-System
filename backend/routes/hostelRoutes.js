import express from "express";
import HostelData from "../models/HostelData.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===============================
// GET hostel data (role filtered)
// ===============================
router.get("/", protect, async (req, res) => {
  try {
    const user = req.user;
    const doc = await HostelData.findById("hosteldata");

    if (!doc) return res.status(404).json({ error: "Hostel data missing" });

    let data = doc.data;

    if (user.role === "caretaker") {
      const hostel = user.assignedHostel;
      return res.json({ data: { [hostel]: data[hostel] } });
    }

    res.json({ data });

  } catch (err) {
    console.error("GET HOSTEL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// BOOK A ROOM (Main Booking)
// ===============================
router.post("/book", protect, async (req, res) => {
  try {
    const { rooms, booking } = req.body;

    const doc = await HostelData.findById("hosteldata");
    const data = doc.data;

    // Generate booking ID
    const id = "b_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    booking.id = id;

    rooms.forEach(r => {
      const hostel = data[r.hostel];
      if (!hostel) return;

      const room = hostel.rooms.find(x => x.roomNo === r.roomNo);
      if (!room) return;

      room.bookings.push({ ...booking });
    });

    await HostelData.findByIdAndUpdate("hosteldata", { data });

    res.json({ success: true, bookingId: id });

  } catch (err) {
    console.error("BOOKING ERROR:", err);
    res.status(500).json({ error: "Booking failed" });
  }
});

export default router;
