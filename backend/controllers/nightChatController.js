// controllers/nightChatController.js
import { ChatRoom, Message } from "../models/NightChat.js";
import { getSocketIO } from "../utils/socket.js";

// ─── Role permissions ──────────────────────────────────────────────────────────

// Roles allowed in society channels
const SOCIETY_CHANNEL_ROLES = ["admin", "adosa", "assistant", "president", "gen_sec"];

// All roles allowed to use messaging at all
const CHAT_ALLOWED_ROLES = ["admin", "adosa", "assistant", "president", "gen_sec"];

// Valid role-to-role direct channels
const VALID_ROLE_CHANNELS = [
  "president-adosa",
  "gen_sec-president",
  "assistant-adosa",
];

const normalizeRoleChannel = (r1, r2) => {
  const pair = [r1, r2].sort().join("-");
  // map sorted pair to canonical name
  const map = {
    "adosa-president":   "president-adosa",
    "gen_sec-president": "gen_sec-president",
    "adosa-assistant":   "assistant-adosa",
  };
  return map[pair] || pair;
};

const canChat = (role) => CHAT_ALLOWED_ROLES.includes((role || "").toLowerCase());

const emitSafe = (event, payload, room) => {
  try {
    const io = getSocketIO();
    if (room) io.to(room).emit(event, payload);
    else io.emit(event, payload);
  } catch (_) {}
};

// ─── Helper: increment unread for all participants except sender ───────────────
const incrementUnread = async (chatRoom, senderId) => {
  const update = {};
  chatRoom.participants.forEach((pid) => {
    if (String(pid) !== String(senderId)) {
      const key = `unreadCounts.${pid}`;
      update[key] = (update[key] || 0) + 1;
    }
  });
  if (Object.keys(update).length) {
    await ChatRoom.findByIdAndUpdate(chatRoom._id, { $inc: update });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/night/chat/rooms  — list all rooms for current user
// ─────────────────────────────────────────────────────────────────────────────
export const getRooms = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    if (!canChat(role))
      return res.status(403).json({ message: "Access denied" });

    const rooms = await ChatRoom.find({
      $or: [
        { allowedRoles: role },
        { participants: req.user._id },
      ],
    }).sort({ updatedAt: -1 });

    // Attach unread count for this user
    const enriched = rooms.map((r) => {
      const obj = r.toObject();
      obj.myUnread = r.unreadCounts?.get?.(String(req.user._id)) || 0;
      return obj;
    });

    return res.json({ success: true, rooms: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/night/chat/rooms/society  — get or create a society channel
// ─────────────────────────────────────────────────────────────────────────────
export const getOrCreateSocietyRoom = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    if (!SOCIETY_CHANNEL_ROLES.includes(role))
      return res.status(403).json({ message: "Only presidents, gen secs, ADOSA and admins can access society channels" });

    const { societyId, societyName } = req.body;
    if (!societyId) return res.status(400).json({ message: "societyId required" });

    let room = await ChatRoom.findOne({ type: "SOCIETY", societyId });

    if (!room) {
      room = await ChatRoom.create({
        type:         "SOCIETY",
        societyId,
        societyName:  societyName || societyId,
        allowedRoles: SOCIETY_CHANNEL_ROLES,
        participants: [req.user._id],
        createdBy:    req.user._id,
      });
    } else if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id);
      await room.save();
    }

    return res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/night/chat/rooms/approval  — get or create approval thread
// ─────────────────────────────────────────────────────────────────────────────
export const getOrCreateApprovalRoom = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    if (!canChat(role))
      return res.status(403).json({ message: "Access denied" });

    const { referenceId, referenceName } = req.body;
    if (!referenceId) return res.status(400).json({ message: "referenceId required" });

    let room = await ChatRoom.findOne({ type: "APPROVAL", referenceId });

    if (!room) {
      room = await ChatRoom.create({
        type:         "APPROVAL",
        referenceId,
        referenceName: referenceName || "Permission Request",
        allowedRoles: CHAT_ALLOWED_ROLES,
        participants: [req.user._id],
        createdBy:    req.user._id,
      });
    } else if (!room.participants.map(String).includes(String(req.user._id))) {
      room.participants.push(req.user._id);
      await room.save();
    }

    return res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/night/chat/rooms/role  — get or create a role DM channel
// ─────────────────────────────────────────────────────────────────────────────
export const getOrCreateRoleRoom = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    if (!canChat(role))
      return res.status(403).json({ message: "Access denied" });

    const { targetRole } = req.body;
    if (!targetRole) return res.status(400).json({ message: "targetRole required" });

    const channel = normalizeRoleChannel(role, targetRole.toLowerCase());
    if (!VALID_ROLE_CHANNELS.includes(channel))
      return res.status(400).json({ message: `Role channel "${channel}" is not permitted` });

    let room = await ChatRoom.findOne({ type: "ROLE", roleChannel: channel });

    if (!room) {
      room = await ChatRoom.create({
        type:         "ROLE",
        roleChannel:  channel,
        allowedRoles: channel.split("-"),
        participants: [req.user._id],
        createdBy:    req.user._id,
      });
    } else if (!room.participants.map(String).includes(String(req.user._id))) {
      room.participants.push(req.user._id);
      await room.save();
    }

    return res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/night/chat/rooms/:roomId/messages
// ─────────────────────────────────────────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    const room = await ChatRoom.findById(req.params.roomId);

    if (!room) return res.status(404).json({ message: "Room not found" });

    // Access check
    const inParticipants = room.participants.map(String).includes(String(req.user._id));
    const inRoles        = room.allowedRoles.includes(role);
    if (!inParticipants && !inRoles)
      return res.status(403).json({ message: "Access denied to this room" });

    const { before, limit = 50 } = req.query;
    const query = { roomId: room._id };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 100));

    // Mark as read — reset unread count for this user
    await ChatRoom.findByIdAndUpdate(room._id, {
      [`unreadCounts.${req.user._id}`]: 0,
    });

    return res.json({ success: true, messages: messages.reverse(), roomId: room._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/night/chat/rooms/:roomId/messages  — send a message
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    const room = await ChatRoom.findById(req.params.roomId);

    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.isLocked) return res.status(403).json({ message: "This thread is locked" });

    // Role + participant check
    const inParticipants = room.participants.map(String).includes(String(req.user._id));
    const inRoles        = room.allowedRoles.includes(role);
    if (!inParticipants && !inRoles)
      return res.status(403).json({ message: "Access denied to this room" });

    if (!canChat(role))
      return res.status(403).json({ message: "Your role cannot send messages" });

    const { content, attachments = [], messageType = "TEXT" } = req.body;

    if (!content?.trim() && attachments.length === 0)
      return res.status(400).json({ message: "Message cannot be empty" });

    if (attachments.length > 5)
      return res.status(400).json({ message: "Maximum 5 attachments per message" });

    const message = await Message.create({
      roomId:      room._id,
      senderId:    req.user._id,
      senderName:  req.user.name,
      senderRole:  req.user.role,
      messageType,
      content:     content?.trim() || "",
      attachments,
    });

    // Update room's last message snapshot
    room.lastMessage = {
      content:    message.content || `[${attachments.length} attachment(s)]`,
      senderName: req.user.name,
      sentAt:     message.createdAt,
    };

    // Add sender to participants if not already
    if (!room.participants.map(String).includes(String(req.user._id))) {
      room.participants.push(req.user._id);
    }

    await room.save();

    // Increment unread for others
    await incrementUnread(room, req.user._id);

    // Emit via socket
    emitSafe("chat:message-new", {
      roomId:  room._id,
      message: message.toObject(),
    }, `chat-room-${room._id}`);

    emitSafe("chat:unread-update", { roomId: room._id }, "night-permissions");

    return res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/night/chat/rooms/:roomId/lock  — admin only
// ─────────────────────────────────────────────────────────────────────────────
export const lockRoom = async (req, res) => {
  try {
    if (!["admin", "adosa"].includes((req.user.role || "").toLowerCase()))
      return res.status(403).json({ message: "Only admin/ADOSA can lock threads" });

    const room = await ChatRoom.findByIdAndUpdate(
      req.params.roomId,
      { isLocked: true },
      { new: true }
    );

    if (!room) return res.status(404).json({ message: "Room not found" });

    // Post a system message
    await Message.create({
      roomId:          room._id,
      senderId:        req.user._id,
      senderName:      req.user.name,
      senderRole:      req.user.role,
      messageType:     "SYSTEM",
      content:         `🔒 Thread locked by ${req.user.name}`,
      isSystemMessage: true,
    });

    return res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/night/chat/unread  — total unread count for badge
// ─────────────────────────────────────────────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    if (!canChat(role)) return res.json({ success: true, total: 0 });

    const rooms = await ChatRoom.find({
      $or: [{ allowedRoles: role }, { participants: req.user._id }],
    });

    let total = 0;
    rooms.forEach((r) => {
      total += r.unreadCounts?.get?.(String(req.user._id)) || 0;
    });

    return res.json({ success: true, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};