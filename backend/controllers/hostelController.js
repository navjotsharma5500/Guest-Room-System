import Hostel from "../models/Hostel.js";
import { createLog } from "../middleware/logMiddleware.js";

// CREATE HOSTEL
export const createHostel = async (req, res) => {
  try {
    const { name, block, type, totalRooms } = req.body;

    if (!name || !block || !type || !totalRooms) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const hostel = await Hostel.create({ name, block, type, totalRooms });

    createLog("hostel_created", req.user._id, { hostelId: hostel._id });

    res.json({ message: "Hostel created successfully", hostel });

  } catch (err) {
    console.error("Hostel Create Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET ALL HOSTELS
export const getHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().sort({ name: 1 });
    res.json(hostels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE HOSTEL
export const getHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    res.json(hostel);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
