// routes/bookingRoutes.js
import express from "express";
import Booking from "../models/Booking.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// =============================================================
// GET ALL BOOKINGS (CONVERTED TO FRONTEND FORMAT)
// =============================================================
router.get("/all", protect, async (req, res) => {
  try {
    const all = await Booking.find();

    const hostels = {};

    all.forEach((b) => {
      if (!hostels[b.hostel]) {
        hostels[b.hostel] = { rooms: [] };
      }

      let room = hostels[b.hostel].rooms.find((r) => r.roomNo === b.roomNo);

      if (!room) {
        room = { roomNo: b.roomNo, bookings: [] };
        hostels[b.hostel].rooms.push(room);
      }

      room.bookings.push({
        id: b._id,
        guest: b.guest,
        from: b.checkIn,
        to: b.checkOut,
        numGuests: b.numGuests,
        purpose: b.purpose,
        city: b.city,
        state: b.state,
        status: b.status || "Booked",
      });
    });

    res.json(hostels);

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =============================================================
// CREATE BOOKING
// =============================================================
router.post("/create", protect, async (req, res) => {
  try {
    const booking = await Booking.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.json({ success: true, booking });
  } catch (err) {
    res.status(400).json({ success: false, message: "Invalid data" });
  }
});

// =============================================================
// UPDATE BOOKING
// =============================================================
router.put("/update/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, booking });
  } catch (err) {
    res.status(400).json({ success: false, message: "Update failed" });
  }
});

// =============================================================
// DELETE BOOKING
// =============================================================
router.delete("/delete/:id", protect, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: "Delete failed" });
  }
});

export default router;
