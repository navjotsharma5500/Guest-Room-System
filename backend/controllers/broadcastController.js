import BroadcastMessage, {
  BROADCAST_MESSAGE_TYPES,
  BROADCAST_RECIPIENT_GROUPS,
} from "../models/BroadcastMessage.js";
import BroadcastDeliveryLog from "../models/BroadcastDeliveryLog.js";
import {
  resolveBroadcastRecipients,
  sendBroadcastMessage,
} from "../services/broadcastScheduler.js";
import { getSystemSettings } from "../utils/systemSettings.js";

const ALLOWED_ROLES = ["admin", "manager", "adosa"];

const roleOf = (user) => String(user?.role || "").toLowerCase();

export const requireBroadcastAccess = async (req, res, next) => {
  const settings = await getSystemSettings({ fresh: true });
  if (settings?.operations?.enableBroadcastCenter === false) {
    return res.status(403).json({
      success: false,
      message: "Broadcast Center is currently disabled by System Controls.",
    });
  }

  if (!ALLOWED_ROLES.includes(roleOf(req.user))) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access Broadcast Center.",
    });
  }
  next();
};

const normalizeEmails = (emails = []) => {
  if (Array.isArray(emails)) {
    return emails
      .map((email) => String(email || "").trim().toLowerCase())
      .filter(Boolean);
  }

  return String(emails || "")
    .split(/[\n,;]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const isNoticeType = (type) => ["general", "emergency"].includes(type);

const buildBroadcastPayload = (body, user) => {
  const recipientGroups = Array.isArray(body.recipientGroups)
    ? body.recipientGroups.filter((group) => BROADCAST_RECIPIENT_GROUPS.includes(group))
    : [];

  const messageType = BROADCAST_MESSAGE_TYPES.includes(body.messageType)
    ? body.messageType
    : "general";
  const now = new Date();
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const noticeBase = scheduledAt && scheduledAt > now ? scheduledAt : now;
  const defaultNoticeEnd = new Date(noticeBase.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    messageType,
    title: String(body.title || "").trim(),
    subject: String(body.subject || "").trim(),
    bodyHtml: String(body.bodyHtml || "").trim(),
    bodyText: String(body.bodyText || "").trim(),
    recipientGroups,
    specificHostel: String(body.specificHostel || "").trim(),
    customEmails: normalizeEmails(body.customEmails),
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    scheduledAt,
    noticeEnabled: isNoticeType(messageType) && body.noticeEnabled !== false,
    noticeStartAt: body.noticeStartAt ? new Date(body.noticeStartAt) : noticeBase,
    noticeEndAt: body.noticeEndAt ? new Date(body.noticeEndAt) : (isNoticeType(messageType) ? defaultNoticeEnd : null),
    createdBy: user._id,
    createdByName: user.name || "",
    createdByRole: user.role || "",
  };
};

const validatePayload = (payload, mode = "draft") => {
  if (!payload.title) return "Title is required.";
  if (!payload.subject) return "Subject is required.";
  if (!payload.bodyHtml) return "Message body is required.";

  if (mode !== "draft" && payload.recipientGroups.length === 0) {
    return "Select at least one recipient group.";
  }

  if (payload.recipientGroups.includes("specific_hostel") && !payload.specificHostel) {
    return "Specific hostel is required for the selected recipient group.";
  }

  if (payload.recipientGroups.includes("custom") && payload.customEmails.length === 0) {
    return "Custom email list is required for the selected recipient group.";
  }

  if (mode === "schedule" && (!payload.scheduledAt || payload.scheduledAt <= new Date())) {
    return "Schedule time must be in the future.";
  }

  if (payload.noticeEnabled && (!payload.noticeEndAt || payload.noticeEndAt <= payload.noticeStartAt)) {
    return "Notice end date must be after notice start date.";
  }

  return null;
};

const canRecipientViewNotice = async (broadcastId, user) => {
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email) return false;

  const log = await BroadcastDeliveryLog.exists({
    broadcastId,
    recipientEmail: email,
  });

  return Boolean(log);
};

export const getMyBroadcastNotices = async (req, res) => {
  const settings = await getSystemSettings({ fresh: true });
  if (settings?.operations?.enableBroadcastCenter === false) {
    return res.json({ success: true, notices: [] });
  }

  const email = String(req.user?.email || "").trim().toLowerCase();
  if (!email) {
    return res.json({ success: true, notices: [] });
  }

  const now = new Date();
  const logs = await BroadcastDeliveryLog.find({
    recipientEmail: email,
  }).distinct("broadcastId");

  if (!logs.length) {
    return res.json({ success: true, notices: [] });
  }

  const notices = await BroadcastMessage.find({
    _id: { $in: logs },
    status: "sent",
    messageType: { $in: ["general", "emergency"] },
    noticeEnabled: true,
    noticeStartAt: { $lte: now },
    noticeEndAt: { $gte: now },
  })
    .select("messageType title subject bodyHtml bodyText attachments noticeStartAt noticeEndAt sentAt createdByName createdByRole recipientGroups specificHostel")
    .sort({ messageType: 1, sentAt: -1, createdAt: -1 })
    .lean();

  res.json({ success: true, notices });
};

export const getMyBroadcastNoticeById = async (req, res) => {
  const settings = await getSystemSettings({ fresh: true });
  if (settings?.operations?.enableBroadcastCenter === false) {
    return res.status(404).json({ success: false, message: "Broadcast notice not found." });
  }

  const allowed = await canRecipientViewNotice(req.params.id, req.user);
  if (!allowed) {
    return res.status(404).json({ success: false, message: "Broadcast notice not found." });
  }

  const now = new Date();
  const notice = await BroadcastMessage.findOne({
    _id: req.params.id,
    status: "sent",
    messageType: { $in: ["general", "emergency"] },
    noticeEnabled: true,
    noticeStartAt: { $lte: now },
    noticeEndAt: { $gte: now },
  }).lean();

  if (!notice) {
    return res.status(404).json({ success: false, message: "Broadcast notice not found." });
  }

  res.json({ success: true, notice });
};

export const getBroadcasts = async (req, res) => {
  const { status, type, q } = req.query;
  const filter = {};

  if (status && status !== "all") filter.status = status;
  if (type && type !== "all") filter.messageType = type;
  if (q) {
    const regex = new RegExp(String(q).trim(), "i");
    filter.$or = [{ title: regex }, { subject: regex }, { bodyText: regex }];
  }

  const messages = await BroadcastMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ success: true, messages });
};

export const getBroadcastById = async (req, res) => {
  const message = await BroadcastMessage.findById(req.params.id).lean();
  if (!message) {
    return res.status(404).json({ success: false, message: "Broadcast not found." });
  }

  const logs = await BroadcastDeliveryLog.find({ broadcastId: message._id })
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  res.json({ success: true, message, logs });
};

export const getBroadcastStats = async (req, res) => {
  const [statusCounts, deliveryCounts] = await Promise.all([
    BroadcastMessage.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    BroadcastDeliveryLog.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statuses = statusCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const deliveries = deliveryCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  res.json({
    success: true,
    stats: {
      total: Object.values(statuses).reduce((sum, value) => sum + value, 0),
      draft: statuses.draft || 0,
      scheduled: statuses.scheduled || 0,
      sent: statuses.sent || 0,
      failed: statuses.failed || 0,
      deliveries,
    },
  });
};

export const previewBroadcastRecipients = async (req, res) => {
  const payload = buildBroadcastPayload(req.body, req.user);
  const recipients = await resolveBroadcastRecipients(payload);

  res.json({
    success: true,
    count: recipients.length,
    recipients: recipients.slice(0, 50),
  });
};

export const createBroadcast = async (req, res) => {
  const mode = ["draft", "schedule", "send_now"].includes(req.body.mode)
    ? req.body.mode
    : "draft";
  const payload = buildBroadcastPayload(req.body, req.user);
  const validationError = validatePayload(payload, mode === "send_now" ? "send" : mode);

  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const status = mode === "schedule" ? "scheduled" : "draft";
  const message = await BroadcastMessage.create({
    ...payload,
    status,
    scheduledAt: mode === "schedule" ? payload.scheduledAt : null,
  });

  if (mode === "send_now") {
    const sentMessage = await sendBroadcastMessage(message._id, req.app.get("io"));
    return res.status(201).json({
      success: true,
      message: "Broadcast sent.",
      broadcast: sentMessage,
    });
  }

  res.status(201).json({
    success: true,
    message: mode === "schedule" ? "Broadcast scheduled." : "Draft saved.",
    broadcast: message,
  });
};

export const updateBroadcast = async (req, res) => {
  const message = await BroadcastMessage.findById(req.params.id);
  if (!message) {
    return res.status(404).json({ success: false, message: "Broadcast not found." });
  }

  if (!["draft", "scheduled"].includes(message.status)) {
    return res.status(400).json({
      success: false,
      message: "Only draft or scheduled broadcasts can be edited.",
    });
  }

  const mode = req.body.status === "scheduled" ? "schedule" : "draft";
  const payload = buildBroadcastPayload(req.body, req.user);
  const validationError = validatePayload(payload, mode);

  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  Object.assign(message, payload, {
    status: req.body.status === "scheduled" ? "scheduled" : "draft",
    scheduledAt: req.body.status === "scheduled" ? payload.scheduledAt : null,
  });
  await message.save();

  res.json({ success: true, message: "Broadcast updated.", broadcast: message });
};

export const sendBroadcastNow = async (req, res) => {
  const message = await BroadcastMessage.findById(req.params.id);
  if (!message) {
    return res.status(404).json({ success: false, message: "Broadcast not found." });
  }

  if (!["draft", "scheduled", "failed"].includes(message.status)) {
    return res.status(400).json({
      success: false,
      message: "This broadcast cannot be sent now.",
    });
  }

  const validationError = validatePayload(message.toObject(), "send");
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const sentMessage = await sendBroadcastMessage(message._id, req.app.get("io"));
  res.json({ success: true, message: "Broadcast sent.", broadcast: sentMessage });
};

export const cancelScheduledBroadcast = async (req, res) => {
  const message = await BroadcastMessage.findById(req.params.id);
  if (!message) {
    return res.status(404).json({ success: false, message: "Broadcast not found." });
  }

  if (message.status !== "scheduled") {
    return res.status(400).json({
      success: false,
      message: "Only scheduled broadcasts can be cancelled.",
    });
  }

  message.status = "cancelled";
  message.lastError = "Cancelled by user";
  await message.save();

  res.json({ success: true, message: "Scheduled broadcast cancelled.", broadcast: message });
};
