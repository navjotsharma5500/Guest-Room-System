// routes/analyticsRoutes.js
// GA4 analytics proxy — GET /api/analytics/ga4
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  downloadScheduledAnalyticsWorkbook,
  downloadScheduledAnalyticsPdf,
  getGA4Analytics,
  getGA4Realtime,
  previewScheduledAnalyticsEmail,
  sendScheduledAnalyticsTestEmail,
} from '../controllers/analyticsController.js';

const router = express.Router();

// GET /api/analytics/ga4?days=30
// Admin only — fetches real GA4 traffic data via service account
router.get('/ga4', protect, authorizeRoles('admin'), getGA4Analytics);
router.get('/ga4/realtime', protect, authorizeRoles('admin'), getGA4Realtime);
router.get('/reports/:reportType/:period/preview-email', protect, authorizeRoles('admin'), previewScheduledAnalyticsEmail);
router.get('/reports/:reportType/:period/download', protect, authorizeRoles('admin'), downloadScheduledAnalyticsWorkbook);
router.get('/reports/:reportType/:period/download-pdf', protect, authorizeRoles('admin'), downloadScheduledAnalyticsPdf);
router.post('/reports/:reportType/:period/send-test', protect, authorizeRoles('admin'), sendScheduledAnalyticsTestEmail);

export default router;
