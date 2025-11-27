const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Hostel = require("../models/Hostel");

// ⭐ GET ALL BOOKINGS
router.get("/all", async (req, res) => {
  try {
    const data = await Hostel.find({});
    res.json(data); // returns { Agira: { rooms: [...] }, ... }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⭐ SAVE THE ENTIRE HOSTEL DATA STRUCTURE
router.post("/save-all", async (req, res) => {
  try {
    const updated = req.body; // full hostelData

    for (const [hostelName, hostelObj] of Object.entries(updated)) {
      await Hostel.findOneAndUpdate(
        { name: hostelName },
        { $set: hostelObj },
        { upsert: true }
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⭐ ADD A BOOKING
router.post("/add", async (req, res) => {
  try {
    const { hostel, roomNo, booking } = req.body;

    const doc = await Hostel.findOne({ name: hostel });
    if (!doc) return res.json({ error: "Hostel not found" });

    const room = doc.rooms.find((r) => r.roomNo === roomNo);
    if (!room) return res.json({ error: "Room not found" });

    room.bookings.push(booking);
    await doc.save();

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⭐ DELETE BOOKING
router.delete("/remove", async (req, res) => {
  try {
    const { hostel, roomNo, bookingId } = req.body;

    const doc = await Hostel.findOne({ name: hostel });
    if (!doc) return res.json({ error: "Hostel not found" });

    const room = doc.rooms.find((r) => r.roomNo === roomNo);
    if (!room) return res.json({ error: "Room not found" });

    room.bookings = room.bookings.filter((b) => b.id !== bookingId);
    await doc.save();

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⭐ EXTEND BOOKING
router.put("/extend", async (req, res) => {
  try {
    const { hostel, roomNo, bookingId, newToDate } = req.body;

    const doc = await Hostel.findOne({ name: hostel });
    if (!doc) return res.json({ error: "Hostel not found" });

    const room = doc.rooms.find((r) => r.roomNo === roomNo);
    if (!room) return res.json({ error: "Room not found" });

    const booking = room.bookings.find((b) => b.id === bookingId);
    if (!booking) return res.json({ error: "Booking not found" });

    booking.to = newToDate;
    await doc.save();

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
