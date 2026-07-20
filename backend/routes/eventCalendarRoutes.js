// backend/routes/eventCalendarRoutes.js
import express from 'express';
import * as eventCalendarController from '../controllers/eventCalendarController.js';
import * as masterEventCalendarController from '../controllers/masterEventCalendarController.js';
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
router.get('/master/month/:year/:month', masterEventCalendarController.getMasterMonth);
router.get('/master/date/:date', masterEventCalendarController.getMasterDate);
router.get('/master/upcoming', masterEventCalendarController.getMasterUpcoming);
router.get('/master/all', masterEventCalendarController.getMasterAll);
router.get('/master/date-colors', masterEventCalendarController.getMasterDateColors);
router.get('/master/holidays', masterEventCalendarController.getMasterHolidays);
router.get('/master/teaching-days', masterEventCalendarController.getMasterTeachingDays);
router.get('/master/health', masterEventCalendarController.getMasterHealth);

// Independent Event Calendar admin auth + source-aware administration
router.post('/admin/login', masterEventCalendarController.adminLogin);
router.post('/admin/logout', masterEventCalendarController.adminLogout);
router.get(
  '/admin/session',
  masterEventCalendarController.requireEventCalendarAdmin,
  masterEventCalendarController.adminSession
);
router.get(
  '/admin/events',
  masterEventCalendarController.requireEventCalendarAdmin,
  masterEventCalendarController.getAdminEvents
);
router.get(
  '/admin/events/:unifiedId',
  masterEventCalendarController.requireEventCalendarAdmin,
  masterEventCalendarController.getAdminEventById
);
router.put(
  '/admin/events/:unifiedId',
  masterEventCalendarController.requireEventCalendarAdmin,
  masterEventCalendarController.updateAdminEvent
);
router.delete(
  '/admin/events/:unifiedId',
  masterEventCalendarController.requireEventCalendarAdmin,
  masterEventCalendarController.deleteAdminEvent
);
router.get(
  '/admin/conflicts',
  masterEventCalendarController.requireEventCalendarAdmin,
  masterEventCalendarController.getAdminConflicts
);

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
