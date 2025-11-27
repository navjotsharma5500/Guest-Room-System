import express from "express";
import {
  createBooking,
  getAllBookings,
  getCaretakerBookings,
  approveBooking,
  cancelBooking
} from "../controllers/bookingController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create booking (any logged-in user)
router.post("/create", protect, createBooking);

// Admin: view all bookings
router.get("/admin", protect, authorizeRoles("admin"), getAllBookings);

// Caretaker: view only their hostel bookings
router.get("/caretaker", protect, authorizeRoles("caretaker"), getCaretakerBookings);

// Approve booking (admin or manager)
router.put("/approve/:id", protect, authorizeRoles("admin", "manager"), approveBooking);

// Cancel booking
router.put("/cancel/:id", protect, authorizeRoles("admin", "manager"), cancelBooking);

export default router;
