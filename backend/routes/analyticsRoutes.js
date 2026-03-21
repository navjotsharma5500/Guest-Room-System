// routes/analyticsRoutes.js
// GA4 analytics proxy — GET /api/analytics/ga4
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { getGA4Analytics } from '../controllers/analyticsController.js';

const router = express.Router();

// GET /api/analytics/ga4?days=30
// Admin only — fetches real GA4 traffic data via service account
router.get('/ga4', protect, authorizeRoles('admin'), getGA4Analytics);

export default router;