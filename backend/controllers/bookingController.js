import Booking from "../models/Booking.js";
const Hostel = require("../models/Hostel.js");
import { createLog } from "../middleware/logMiddleware.js";
import { sendBookingEmail } from "../emails/bookingEmail.js";

// ================================
// CREATE BOOKING
// ================================
export const createBooking = async (req, res) => {
  try {
    const { hostel } = req.body;

    // Fetch hostel details for email
    const hostelData = await Hostel.findById(hostel);

    if (!hostelData) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    // Create booking
    const booking = await Booking.create({
      ...req.body,
      createdBy: req.user._id,
    });

    // Log
    createLog("booking_created", req.user._id, { bookingId: booking._id });

    // Send email
    await sendBookingEmail(booking.guestEmail, {
      guestName: booking.guestName,
      hostelName: hostelData.name,
      roomNo: booking.roomNo,
      startDate: booking.startDate,
      endDate: booking.endDate,
    });

    res.json({ message: "Booking created", booking });

  } catch (err) {
    console.error("Booking Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ================================
// GET ALL BOOKINGS (ADMIN)
// ================================
export const getAllBookings = async (req, res) => {
  const bookings = await Booking.find().populate("hostel");
  res.json(bookings);
};

// ================================
// GET BOOKINGS FOR CARETAKER
// ================================
export const getCaretakerBookings = async (req, res) => {
  const bookings = await Booking.find({
    hostel: req.user.assignedHostel,
  }).populate("hostel");

  res.json(bookings);
};

// ================================
// APPROVE BOOKING
// ================================
export const approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("hostel");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "approved";
    await booking.save();

    createLog("booking_approved", req.user._id, { bookingId: booking._id });

    res.json({ message: "Booking approved", booking });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================
// CANCEL BOOKING
// ================================
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "cancelled";
    await booking.save();

    createLog("booking_cancelled", req.user._id, { bookingId: booking._id });

    res.json({ message: "Booking cancelled", booking });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
