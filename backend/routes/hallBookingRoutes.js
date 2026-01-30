import express from 'express';
import * as hallBookingController from '../controllers/hallBookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Create new hall booking
router.post('/', protect, hallBookingController.createHallBooking);

// Get all hall bookings (admin/assistant only)
router.get(
  '/',
  protect,
  (req, res, next) => {
    if (!['admin', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  },
  hallBookingController.getAllHallBookings
);

// Get hall bookings by date range
router.get('/date-range', protect, hallBookingController.getHallBookingsByDateRange);

// Get hall bookings by hall
router.get('/hall/:hall', protect, hallBookingController.getHallBookingsByHall);

// Get single hall booking by ID
router.get('/:id', protect, hallBookingController.getHallBookingById);

// Extend hall booking
router.patch('/:id/extend', protect, hallBookingController.extendHallBooking);

// Cancel hall booking
router.patch('/:id/cancel', protect, hallBookingController.cancelHallBooking);

// Update hall booking status
router.patch('/:id/status', protect, hallBookingController.updateHallBookingStatus);

// Delete hall booking (admin only)
router.delete(
  '/:id',
  protect,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  },
  hallBookingController.deleteHallBooking
);

export default router;