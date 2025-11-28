import express from "express";
import Hostel from "../models/Hostel.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET ALL HOSTELS
router.get("/all", protect, async (req, res) => {
  try {
    const hostels = await Hostel.find({});
    res.json({ success: true, hostels });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
