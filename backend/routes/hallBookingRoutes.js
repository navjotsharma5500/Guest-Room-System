import express from 'express';
import * as hallBookingController from '../controllers/hallBookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Health check - isolated from guest room system
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    system: 'hall-booking',
    isolated: true,
    timestamp: new Date().toISOString()
  });
});

// Middleware for admin/assistant only
const adminAssistantOnly = (req, res, next) => {
  if (!['admin', 'assistant'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Admin or Assistant role required' });
  }
  next();
};

// Get all hall bookings (admin/assistant only)
router.get('/', protect, adminAssistantOnly, hallBookingController.getAllHallBookings);

// Create hall booking (admin/assistant only)
router.post('/', protect, adminAssistantOnly, hallBookingController.createHallBooking);

// Get hall bookings by date range (admin/assistant only)
router.get('/date-range', protect, adminAssistantOnly, hallBookingController.getHallBookingsByDateRange);

// Get hall bookings by hall (admin/assistant only)
router.get('/hall/:hall', protect, adminAssistantOnly, hallBookingController.getHallBookingsByHall);

// Get single hall booking by ID (admin/assistant only)
router.get('/:id', protect, adminAssistantOnly, hallBookingController.getHallBookingById);

// Extend hall booking (admin/assistant only)
router.patch('/:id/extend', protect, adminAssistantOnly, hallBookingController.extendHallBooking);

// Cancel hall booking (admin/assistant only)
router.patch('/:id/cancel', protect, adminAssistantOnly, hallBookingController.cancelHallBooking);

// Update hall booking status (admin/assistant only)
router.patch('/:id/status', protect, adminAssistantOnly, hallBookingController.updateHallBookingStatus);

// Delete hall booking (admin only)
router.delete('/:id', protect, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}, hallBookingController.deleteHallBooking);

export default router;