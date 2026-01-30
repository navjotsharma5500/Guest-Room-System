// backend/routes/unifiedBookingRoutes.js
import express from 'express';
import { getAllUnifiedBookings, getUnifiedBookingsByDateRange } from '../controllers/unifiedBookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all bookings (guest + hall) with role-based filtering
router.get('/', protect, getAllUnifiedBookings);

// Get bookings by date range
router.get('/date-range', protect, getUnifiedBookingsByDateRange);

export default router;