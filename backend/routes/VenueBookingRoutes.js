// VenueBookingRoutes.js - Routes for venue booking system, isolated from guest room system
import express from 'express';
import * as venueBookingController from '../controllers/VenueBookingController.js';
import { protect } from '../middleware/auth.js';
import { hasVenueDashboardAccess } from '../utils/venueAccessPolicy.js';

const router = express.Router();

// Health check - isolated from guest room system
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    system: 'venue-booking',
    isolated: true,
    timestamp: new Date().toISOString()
  });
});

// Middleware for admin/assistant/dd_assistant only
const adminAssistantOnly = (req, res, next) => {
  if (!hasVenueDashboardAccess(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Admin, Assistant, or DD Assistant role required' });
  }
  next();
};

// Get all venue bookings (admin/assistant only)
router.get('/', protect, adminAssistantOnly, venueBookingController.getAllVenueBookings);

// Create venue booking (admin/assistant only)
router.post('/', protect, adminAssistantOnly, venueBookingController.createVenueBooking);

// Get venue bookings by date range (admin/assistant only)
router.get('/date-range', protect, adminAssistantOnly, venueBookingController.getVenueBookingsByDateRange);

// Get venue bookings by venue name/category (admin/assistant only)
router.get('/venue/:venue', protect, adminAssistantOnly, venueBookingController.getVenueBookingsByVenue);

// Get single venue booking by ID (admin/assistant only)
router.get('/:id', protect, adminAssistantOnly, venueBookingController.getVenueBookingById);

// Update editable venue booking fields (admin/assistant only)
router.patch('/:id', protect, adminAssistantOnly, venueBookingController.updateVenueBooking);

// Extend venue booking (admin/assistant only)
router.patch('/:id/extend', protect, adminAssistantOnly, venueBookingController.extendVenueBooking);

// Cancel venue booking (admin/assistant only)
router.patch('/:id/cancel', protect, adminAssistantOnly, venueBookingController.cancelVenueBooking);

// Update venue booking status (admin/assistant only)
router.patch('/:id/status', protect, adminAssistantOnly, venueBookingController.updateVenueBookingStatus);

// Delete venue booking (admin only)
router.delete('/:id', protect, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}, venueBookingController.deleteVenueBooking);

export default router;
