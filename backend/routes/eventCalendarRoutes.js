// backend/routes/eventCalendarRoutes.js
import express from 'express';
import * as eventCalendarController from '../controllers/eventCalendarController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Middleware for admin/assistant only
const adminAssistantOnly = (req, res, next) => {
  if (!['admin', 'assistant'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Admin or Assistant role required' });
  }
  next();
};

// Public routes (anyone can view)
router.get('/public', eventCalendarController.getAllEvents);
router.get('/public/upcoming', eventCalendarController.getUpcomingEvents);
router.get('/public/:id', eventCalendarController.getEventById);
router.get('/public/date/:date', eventCalendarController.getEventsByDate);
router.get('/public/month/:year/:month', eventCalendarController.getEventsByMonth);

// Protected routes (admin/assistant only)
router.post('/', protect, adminAssistantOnly, eventCalendarController.createEvent);
router.put('/:id', protect, adminAssistantOnly, eventCalendarController.updateEvent);
router.delete('/:id', protect, adminAssistantOnly, eventCalendarController.deleteEvent);

// Autocomplete suggestions (admin/assistant only)
router.get('/suggestions/events', protect, adminAssistantOnly, eventCalendarController.getEventNameSuggestions);
router.get('/suggestions/societies', protect, adminAssistantOnly, eventCalendarController.getSocietyNameSuggestions);

export default router;