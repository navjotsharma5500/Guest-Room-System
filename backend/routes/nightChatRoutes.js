// routes/nightChatRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getRooms,
  getOrCreateSocietyRoom,
  getOrCreateApprovalRoom,
  getOrCreateRoleRoom,
  getMessages,
  sendMessage,
  lockRoom,
  getUnreadCount,
} from "../controllers/nightChatController.js";

const router = express.Router();
router.use(protect);

router.get("/rooms",                          getRooms);
router.get("/unread",                         getUnreadCount);
router.post("/rooms/society",                 getOrCreateSocietyRoom);
router.post("/rooms/approval",                getOrCreateApprovalRoom);
router.post("/rooms/role",                    getOrCreateRoleRoom);
router.get("/rooms/:roomId/messages",         getMessages);
router.post("/rooms/:roomId/messages",        sendMessage);
router.post("/rooms/:roomId/lock",            lockRoom);

export default router;

// ─── In your main server.js / app.js, add: ───────────────────────────────────
// import nightChatRoutes from './routes/nightChatRoutes.js';
// app.use('/api/night/chat', nightChatRoutes);
//
// ─── In your Socket.IO setup, add room joining: ───────────────────────────────
// socket.on("join-chat-room", (roomId) => {
//   socket.join(`chat-room-${roomId}`);
// });