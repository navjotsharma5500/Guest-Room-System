import Booking from "../models/Booking.js";
import GuestFlag from "../models/GuestFlag.js";
import { createLog } from "../middleware/logMiddleware.js";
import { getSystemSettings } from "../utils/systemSettings.js";
import {
  calculateGuestSeverity,
  getFlagSeverityScore,
  getGuestRiskStatus,
  normalizeGuestIdentity,
} from "../utils/guestFlagging.js";

const FLAG_TYPES = new Set(["yellow", "orange", "red"]);

const emitFlagEvent = (req, event, payload) => {
  const io = req.app.get("io");
  if (!io) return;
  io.to("dashboard-room").emit(event, { ...payload, timestamp: Date.now() });
};

export const createGuestFlag = async (req, res) => {
  try {
    const settings = await getSystemSettings({ fresh: true });
    if (settings?.operations?.enableGuestFlagging === false) {
      return res.status(403).json({ success: false, message: "Guest flagging is disabled by System Controls" });
    }

    const { bookingId, flagType, remarks, attachments = [] } = req.body || {};
    const normalizedFlagType = String(flagType || "").toLowerCase();

    if (!bookingId) return res.status(400).json({ success: false, message: "Booking ID is required" });
    if (!FLAG_TYPES.has(normalizedFlagType)) {
      return res.status(400).json({ success: false, message: "Valid flag type is required" });
    }
    if (!String(remarks || "").trim()) {
      return res.status(400).json({ success: false, message: "Remarks are required" });
    }
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return res.status(400).json({ success: false, message: "At least one attachment is required" });
    }

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const identity = normalizeGuestIdentity({ email: booking.email, contact: booking.contact });
    const flag = await GuestFlag.create({
      guestId: booking._id,
      bookingId: booking._id,
      guestName: booking.guest || "",
      email: identity.email,
      contact: identity.contact,
      hostel: booking.hostel || "",
      roomNo: booking.roomNo || "",
      flagType: normalizedFlagType,
      remarks: String(remarks).trim(),
      attachments,
      flaggedBy: req.user._id,
      severityScore: getFlagSeverityScore(normalizedFlagType, settings),
    });

    const risk = await getGuestRiskStatus(identity, settings);

    createLog("guest_flagged", req.user?._id, {
      bookingId: booking._id,
      flagId: flag._id,
      flagType: normalizedFlagType,
      blocked: risk.blocked,
    });

    emitFlagEvent(req, "guest_flagged", {
      bookingId: booking._id,
      flagId: flag._id,
      guestName: booking.guest,
      hostel: booking.hostel,
      roomNo: booking.roomNo,
      flagType: normalizedFlagType,
      risk,
    });

    if (risk.blocked) {
      emitFlagEvent(req, "guest_blocked", {
        bookingId: booking._id,
        guestName: booking.guest,
        email: identity.email,
        contact: identity.contact,
        reason: risk.reason,
        risk,
      });
    }

    res.status(201).json({ success: true, flag, risk });
  } catch (error) {
    console.error("❌ Create guest flag error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to flag guest" });
  }
};

export const getGuestFlagsForBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const settings = await getSystemSettings({ fresh: true });
    const identity = normalizeGuestIdentity({ email: booking.email, contact: booking.contact });
    const allFlags = await GuestFlag.find({
      $or: [{ email: identity.email }, { contact: identity.contact }].filter((item) => Object.values(item)[0]),
    })
      .sort({ createdAt: -1 })
      .populate("flaggedBy", "name email role")
      .populate("override.overriddenBy", "name email role")
      .lean();

    const activeFlags = allFlags.filter((flag) => flag.isActive && flag.override?.isOverridden !== true);
    const risk = {
      ...calculateGuestSeverity(activeFlags, settings),
      flags: activeFlags,
      disabled: settings?.operations?.enableGuestFlagging === false,
    };

    res.json({ success: true, flags: allFlags, risk });
  } catch (error) {
    console.error("❌ Get guest flags error:", error);
    res.status(500).json({ success: false, message: "Failed to load guest flags" });
  }
};

export const getGuestFlagStatus = async (req, res) => {
  try {
    const risk = await getGuestRiskStatus({
      email: req.query.email,
      contact: req.query.contact,
    });
    res.json({ success: true, risk });
  } catch (error) {
    console.error("❌ Get guest flag status error:", error);
    res.status(500).json({ success: false, message: "Failed to load guest flag status" });
  }
};

export const overrideGuestFlag = async (req, res) => {
  try {
    const remarks = String(req.body?.remarks || "").trim();
    if (!remarks) {
      return res.status(400).json({ success: false, message: "Override remarks are required" });
    }

    const flag = await GuestFlag.findById(req.params.id);
    if (!flag) return res.status(404).json({ success: false, message: "Flag not found" });

    flag.override = {
      isOverridden: true,
      overriddenBy: req.user._id,
      overriddenAt: new Date(),
      remarks,
    };
    await flag.save();

    const risk = await getGuestRiskStatus({ email: flag.email, contact: flag.contact });
    createLog("guest_flag_overridden", req.user?._id, { flagId: flag._id, bookingId: flag.bookingId });

    res.json({ success: true, flag, risk });
  } catch (error) {
    console.error("❌ Override guest flag error:", error);
    res.status(500).json({ success: false, message: "Failed to override guest flag" });
  }
};
