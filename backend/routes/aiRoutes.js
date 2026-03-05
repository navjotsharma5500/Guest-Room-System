// routes/aiRoutes.js
// Echo AI proxy — POST /api/ai/chat
import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { echoChat } from '../controllers/aiController.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  createEchoKnowledge,
  deleteEchoKnowledge,
  exportEchoKnowledgeCsv,
  getEchoKnowledgeList,
  importEchoKnowledgeCsv,
  updateEchoKnowledge,
} from '../controllers/echoKnowledgeController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/ai/chat
// Authenticated users only (protect middleware validates JWT)
router.post('/chat', protect, echoChat);
router.get('/knowledge', protect, authorizeRoles('admin'), getEchoKnowledgeList);
router.get('/knowledge/export', protect, authorizeRoles('admin'), exportEchoKnowledgeCsv);
router.post('/knowledge/import', protect, authorizeRoles('admin'), upload.single('file'), importEchoKnowledgeCsv);
router.post('/knowledge', protect, authorizeRoles('admin'), createEchoKnowledge);
router.put('/knowledge/:id', protect, authorizeRoles('admin'), updateEchoKnowledge);
router.delete('/knowledge/:id', protect, authorizeRoles('admin'), deleteEchoKnowledge);

export default router;
