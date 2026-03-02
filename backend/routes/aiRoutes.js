// routes/aiRoutes.js
// Echo AI proxy — POST /api/ai/chat
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { echoChat } from '../controllers/aiController.js';

const router = express.Router();

// POST /api/ai/chat
// Authenticated users only (protect middleware validates JWT)
router.post('/chat', protect, echoChat);

export default router;