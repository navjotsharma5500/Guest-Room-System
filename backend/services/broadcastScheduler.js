import BroadcastMessage from "../models/BroadcastMessage.js";
import BroadcastDeliveryLog from "../models/BroadcastDeliveryLog.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import { sendEmailAdvanced } from "../emails/sendEmail.js";
import masterTemplate from "../emails/templates/masterTemplate.js";
import { getSystemSettings } from "../utils/systemSettings.js";

let schedulerStarted = false;
let schedulerTimer = null;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const stripHtml = (html = "") =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const typeLabel = (type = "general") =>
  String(type)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const addRecipient = (map, recipient) => {
  const email = normalizeEmail(recipient.email);
  if (!email || map.has(email)) return;
  map.set(email, {
    email,
    name: recipient.name || "",
    role: recipient.role || "",
    group: recipient.group || "",
  });
};

const userQueryByRoles = async (roles) => {
  const regexes = roles.map((role) => new RegExp(`^${role}$`, "i"));
  return User.find({
    role: { $in: regexes },
    isActive: { $ne: false },
    email: { $exists: true, $ne: "" },
  }).select("name email role assignedHostel hostel");
};

export const resolveBroadcastRecipients = async (message) => {
  const recipients = new Map();
  const groups = Array.isArray(message.recipientGroups) ? message.recipientGroups : [];

  if (groups.includes("all_caretakers")) {
    const users = await userQueryByRoles(["caretaker"]);
    users.forEach((user) =>
      addRecipient(recipients, {
        email: user.email,
        name: user.name,
        role: user.role,
        group: "all_caretakers",
      })
    );
  }

  if (groups.includes("all_wardens")) {
    const users = await userQueryByRoles(["warden", "Warden"]);
    users.forEach((user) =>
      addRecipient(recipients, {
        email: user.email,
        name: user.name,
        role: user.role,
        group: "all_wardens",
      })
    );
  }

  if (groups.includes("all_active_guests")) {
    const bookings = await Booking.find({
      status: { $in: ["booked", "checked_in"] },
      email: { $exists: true, $ne: "" },
    }).select("guest email status hostel roomNo");

    bookings.forEach((booking) =>
      addRecipient(recipients, {
        email: booking.email,
        name: booking.guest,
        role: "guest",
        group: "all_active_guests",
      })
    );
  }

  if (groups.includes("all_defaulters")) {
    const bookings = await Booking.find({
      balanceAmount: { $gt: 0 },
      status: { $nin: ["cancelled", "checked_out", "no_show"] },
      email: { $exists: true, $ne: "" },
    }).select("guest email status hostel roomNo balanceAmount");

    bookings.forEach((booking) =>
      addRecipient(recipients, {
        email: booking.email,
        name: booking.guest,
        role: "guest",
        group: "all_defaulters",
      })
    );
  }

  if (groups.includes("specific_hostel") && message.specificHostel) {
    const hostelRegex = new RegExp(`^${String(message.specificHostel).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    const hostelUsers = await User.find({
      role: { $in: [/^caretaker$/i, /^warden$/i] },
      isActive: { $ne: false },
      email: { $exists: true, $ne: "" },
      $or: [{ assignedHostel: hostelRegex }, { hostel: hostelRegex }],
    }).select("name email role assignedHostel hostel");

    hostelUsers.forEach((user) =>
      addRecipient(recipients, {
        email: user.email,
        name: user.name,
        role: user.role,
        group: "specific_hostel",
      })
    );

    const hostelGuests = await Booking.find({
      hostel: hostelRegex,
      status: { $in: ["booked", "checked_in"] },
      email: { $exists: true, $ne: "" },
    }).select("guest email status hostel roomNo");

    hostelGuests.forEach((booking) =>
      addRecipient(recipients, {
        email: booking.email,
        name: booking.guest,
        role: "guest",
        group: "specific_hostel",
      })
    );
  }

  if (groups.includes("custom")) {
    (message.customEmails || []).forEach((email) =>
      addRecipient(recipients, {
        email,
        role: "custom",
        group: "custom",
      })
    );
  }

  return Array.from(recipients.values());
};

const buildBroadcastHtml = (message) => {
  const attachmentsHtml =
    Array.isArray(message.attachments) && message.attachments.length > 0
      ? `
        <div style="margin-top:22px;padding:16px;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff;text-align:left;">
          <div style="font-weight:700;color:#0f4c81;margin-bottom:8px;">Attachments</div>
          ${message.attachments
            .map(
              (file) =>
                `<div style="margin:6px 0;"><a href="${escapeHtml(file.url)}" style="color:#1b74c9;text-decoration:none;">${escapeHtml(file.name || file.url)}</a></div>`
            )
            .join("")}
        </div>`
      : "";

  return masterTemplate({
    title: escapeHtml(message.title),
    skipDefaultButton: true,
    content: `
      <div style="display:inline-block;margin-bottom:18px;padding:7px 14px;border-radius:999px;background:#e8f1fb;color:#0f4c81;font-weight:700;font-size:12px;">
        ${escapeHtml(typeLabel(message.messageType))}
      </div>
      <div style="text-align:left;font-size:15px;line-height:1.7;color:#1f2937;">
        ${message.bodyHtml}
      </div>
      ${attachmentsHtml}
    `,
  });
};

const toMailAttachments = (attachments = []) =>
  attachments
    .filter((file) => file?.url)
    .map((file) => ({
      filename: file.name || "broadcast-attachment",
      path: file.url,
    }));

export const sendBroadcastMessage = async (messageId, io = null) => {
  const settings = await getSystemSettings({ fresh: true });
  if (settings?.operations?.enableBroadcastCenter === false) {
    throw new Error("Broadcast Center is currently disabled by System Controls.");
  }

  const message = await BroadcastMessage.findById(messageId);
  if (!message) {
    throw new Error("Broadcast message not found");
  }

  if (message.status === "sent" || message.status === "cancelled") {
    return message;
  }

  message.status = "sending";
  message.lastError = "";
  await message.save();

  const recipients = await resolveBroadcastRecipients(message);
  message.totalRecipients = recipients.length;

  if (recipients.length === 0) {
    message.status = "failed";
    message.failedCount = 0;
    message.sentCount = 0;
    message.lastError = "No recipients resolved for selected groups.";
    await message.save();
    return message;
  }

  let sentCount = 0;
  let failedCount = 0;
  const html = buildBroadcastHtml(message);
  const attachments = toMailAttachments(message.attachments);
  const priority = message.messageType === "emergency" ? "high" : "normal";

  for (const recipient of recipients) {
    const log = await BroadcastDeliveryLog.create({
      broadcastId: message._id,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientRole: recipient.role,
      recipientGroup: recipient.group,
      status: "pending",
    });

    try {
      log.attempts += 1;
      const ok = await sendEmailAdvanced({
        to: recipient.email,
        subject: message.subject,
        html,
        text: message.bodyText || stripHtml(message.bodyHtml),
        priority,
        attachments,
      });

      if (!ok) {
        throw new Error("Email sender returned failure after retries");
      }

      log.status = "sent";
      log.sentAt = new Date();
      sentCount += 1;
    } catch (err) {
      log.status = "failed";
      log.errorMessage = err.message || "Email delivery failed";
      failedCount += 1;
    }

    await log.save();
  }

  message.sentCount = sentCount;
  message.failedCount = failedCount;
  message.status = sentCount > 0 ? "sent" : "failed";
  message.sentAt = new Date();
  message.lastError = failedCount > 0 ? `${failedCount} recipient(s) failed` : "";
  await message.save();

  const payload = {
    _id: message._id,
    title: message.title,
    status: message.status,
    totalRecipients: message.totalRecipients,
    sentCount: message.sentCount,
    failedCount: message.failedCount,
    sentAt: message.sentAt,
  };

  const socket = io || global.io;
  if (socket) {
    socket.to("dashboard-room").emit("broadcast_sent", payload);
  }

  return message;
};

const processScheduledBroadcasts = async (io = null) => {
  const dueMessages = await BroadcastMessage.find({
    status: "scheduled",
    scheduledAt: { $lte: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .limit(10);

  for (const message of dueMessages) {
    try {
      await sendBroadcastMessage(message._id, io);
    } catch (err) {
      message.status = "failed";
      message.lastError = err.message || "Scheduled broadcast failed";
      await message.save();
      console.error("❌ Scheduled broadcast failed:", err);
    }
  }
};

export const startBroadcastScheduler = (io = null) => {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log("🟢 Starting broadcast scheduler...");
  schedulerTimer = setInterval(() => {
    processScheduledBroadcasts(io).catch((err) =>
      console.error("❌ Broadcast scheduler error:", err)
    );
  }, 60 * 1000);

  setTimeout(() => {
    processScheduledBroadcasts(io).catch((err) =>
      console.error("❌ Broadcast scheduler startup error:", err)
    );
  }, 10 * 1000);

  console.log("✅ Broadcast scheduler started - runs every minute");
};

export const stopBroadcastScheduler = () => {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
  schedulerStarted = false;
};
