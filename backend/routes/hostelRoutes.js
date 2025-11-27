import express from "express";
import HostelData from "../models/HostelData.js";

const router = express.Router();

// GET hostel data (role filtered)
router.get("/", async (req, res) => {
  try {
    const user = req.user; // assuming JWT attached user object
    const doc = await HostelData.findById("hosteldata");

    if (!doc) return res.status(404).json({ error: "Hostel data missing" });

    let data = doc.data;

    // caretaker → return only assigned hostel
    if (user.role === "caretaker") {
      const hostel = user.assignedHostel;
      return res.json({ data: { [hostel]: data[hostel] } });
    }

    // admin + manager → return full data
    return res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// POST consolidated booking
router.post("/book", async (req, res) => {
  try {
    const { rooms, booking } = req.body;

    const doc = await HostelData.findById("hosteldata");
    const data = doc.data;

    // Generate booking ID
    const id = "b_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    booking.id = id;

    // Insert into hostelData structure
    rooms.forEach(r => {
      const hostel = data[r.hostel];
      if (!hostel) return;

      const room = hostel.rooms.find(x => x.roomNo === r.roomNo);
      if (!room) return;

      room.bookings.push({ ...booking });
    });

    await HostelData.findByIdAndUpdate("hosteldata", { data });

    return res.json({ success: true, bookingId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Booking failed" });
  }
});

export default router;
