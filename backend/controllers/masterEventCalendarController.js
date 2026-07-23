import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  getMasterEvents,
  getSourceEvent,
  getStudentDateColors,
  invalidateMasterCalendarCache,
  paginateEvents,
} from "../services/masterEventCalendarService.js";
import VenueBooking from "../models/VenueBooking.js";
import EventCalendar from "../models/EventCalendar.js";
import MasterEventCalendarOverride from "../models/MasterEventCalendarOverride.js";
import User from "../models/User.js";
import { getSocketIO } from "../utils/socket.js";

const ADMIN_COOKIE = "event_calendar_admin";
const loginAttempts = new Map();

const monthRange = (year, month) => {
  const paddedMonth = String(month).padStart(2, "0");
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return {
    startDate: `${year}-${paddedMonth}-01`,
    endDate: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
};

const normalizeCalendarType = (value) => {
  if (value === "student-calendar") return "student_calendar";
  if (value === "institute-calendar") return "institute_calendar";
  return value;
};

const eventFiltersFromQuery = (query = {}) => ({
  sourceType: query.sourceType,
  calendarType: normalizeCalendarType(query.calendarType),
  recordType: query.recordType,
  search: query.search,
  status: query.status,
  venue: query.venue,
  hall: query.hall,
  roomNo: query.roomNo,
  department: query.department,
  societyName: query.societyName,
  startDate: query.startDate,
  endDate: query.endDate,
});

const sendEvents = async (req, res, extraFilters = {}) => {
  const { events, sources } = await getMasterEvents({
    ...eventFiltersFromQuery(req.query),
    ...extraFilters,
  });
  res.json({ success: true, events, count: events.length, sources });
};

export const getMasterMonth = async (req, res) => {
  try {
    const { year, month } = req.params;
    await sendEvents(req, res, monthRange(year, month));
  } catch (err) {
    console.error("Master month calendar error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch master calendar month" });
  }
};

export const getMasterDate = async (req, res) => {
  try {
    const { date } = req.params;
    await sendEvents(req, res, { startDate: date, endDate: date });
  } catch (err) {
    console.error("Master date calendar error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch master calendar date" });
  }
};

export const getMasterUpcoming = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await sendEvents(req, res, { startDate: today });
  } catch (err) {
    console.error("Master upcoming calendar error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch upcoming master events" });
  }
};

export const getMasterAll = async (req, res) => {
  try {
    const { events, sources } = await getMasterEvents(eventFiltersFromQuery(req.query));
    const paged = paginateEvents(events, req.query.page || 1, req.query.limit || 50);
    res.json({ success: true, ...paged, sources });
  } catch (err) {
    console.error("Master all calendar error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch master events" });
  }
};

export const getMasterDateColors = async (req, res) => {
  try {
    const result = await getStudentDateColors({ start: req.query.start, end: req.query.end });
    res.json(result);
  } catch (err) {
    console.error("Master date colors error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch date colors" });
  }
};

export const getMasterHolidays = async (req, res) => {
  try {
    await sendEvents(req, res, {
      calendarType: "student_calendar",
      recordType: "holiday",
      startDate: req.query.startDate || req.query.start,
      endDate: req.query.endDate || req.query.end,
    });
  } catch (err) {
    console.error("Master holidays error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch holidays" });
  }
};

export const getMasterTeachingDays = async (req, res) => {
  try {
    await sendEvents(req, res, {
      calendarType: "student_calendar",
      recordType: "teaching-day",
      startDate: req.query.startDate || req.query.start,
      endDate: req.query.endDate || req.query.end,
    });
  } catch (err) {
    console.error("Master teaching days error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch teaching days" });
  }
};

export const getMasterHealth = async (req, res) => {
  try {
    const { sources } = await getMasterEvents({});
    res.json({ success: true, sources });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch source health" });
  }
};

const isLockedOut = (ip) => {
  const item = loginAttempts.get(ip);
  return item?.lockedUntil && item.lockedUntil > Date.now();
};

export const adminLogin = async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (isLockedOut(ip)) {
      return res.status(429).json({ success: false, message: "Too many attempts. Try again later." });
    }

    const expected = process.env.EVENT_CALENDAR_ADMIN_PASSWORD;
    if (!expected || req.body?.password !== expected) {
      const current = loginAttempts.get(ip) || { count: 0 };
      const next = { count: current.count + 1 };
      if (next.count >= 5) next.lockedUntil = Date.now() + (15 * 60 * 1000);
      loginAttempts.set(ip, next);
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    loginAttempts.delete(ip);
    const token = jwt.sign(
      { scope: "event-calendar-admin" },
      process.env.EVENT_CALENDAR_SESSION_SECRET || process.env.JWT_SECRET || "event-calendar-session-secret",
      { expiresIn: "8h" }
    );

    res.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

export const adminLogout = async (req, res) => {
  res.clearCookie(ADMIN_COOKIE);
  res.json({ success: true });
};

const EVENT_CALENDAR_ADMIN_ROLES = new Set(["admin", "assistant"]);

const getDashboardToken = (req) => {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }
  return req.cookies?.token || null;
};

export const requireEventCalendarAdmin = async (req, res, next) => {
  const token = req.cookies?.[ADMIN_COOKIE];
  try {
    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.EVENT_CALENDAR_SESSION_SECRET || process.env.JWT_SECRET || "event-calendar-session-secret"
        );
        if (decoded.scope === "event-calendar-admin") {
          req.eventCalendarAdmin = decoded;
          return next();
        }
      } catch {
        res.clearCookie(ADMIN_COOKIE);
      }
    }

    const dashboardToken = getDashboardToken(req);
    if (dashboardToken) {
      const decoded = jwt.verify(dashboardToken, process.env.JWT_SECRET);
      const userId = typeof decoded?.id === "string" ? decoded.id : String(decoded?.id || "");
      if (mongoose.Types.ObjectId.isValid(userId)) {
        const user = await User.findById(userId).select("-password").lean();
        const role = String(user?.role || "").toLowerCase();
        if (user && EVENT_CALENDAR_ADMIN_ROLES.has(role)) {
          req.user = user;
          req.eventCalendarAdmin = {
            scope: "dashboard-admin",
            userId: String(user._id),
            email: user.email,
            role: user.role,
          };
          return next();
        }
      }
    }

    return res.status(401).json({ success: false, message: "Admin session required" });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid admin session" });
  }
};

export const adminSession = async (req, res) => {
  res.json({ success: true, authenticated: true });
};

const eventStatusForStats = (event) => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
  const startDate = event.eventDate || "";
  const endDate = event.eventEndDate || event.eventDate || "";
  const startMinutes = parseMinutes(event.eventTime);
  const endMinutes = parseMinutes(event.checkOutTime);

  if (startDate > today) return "upcoming";
  if (endDate < today) return "completed";
  if (startDate <= today && endDate >= today) {
    if (startMinutes !== null && endMinutes !== null) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes ? "live" : "active";
    }
    return "active";
  }
  return "completed";
};

const detectEventConflicts = (events) => {
  const candidates = events.filter((event) =>
    event.recordType === "event" &&
    event.sourceStatus !== "cancelled" &&
    event.conflictResolved !== true &&
    event.eventHall?.hall &&
    event.eventDate &&
    event.eventTime &&
    event.checkOutTime
  );
  const conflicts = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      const sameVenue =
        `${a.eventHall.hall} ${a.eventHall.roomNo || ""}`.trim().toLowerCase() ===
        `${b.eventHall.hall} ${b.eventHall.roomNo || ""}`.trim().toLowerCase();
      const dateOverlap = a.eventDate <= (b.eventEndDate || b.eventDate) && (a.eventEndDate || a.eventDate) >= b.eventDate;
      const timeOverlap = hasTimeOverlap(a, b);
      if (sameVenue && dateOverlap && timeOverlap) {
        conflicts.push({
          conflictId: [a.unifiedId, b.unifiedId].sort().join("__"),
          firstEvent: a,
          secondEvent: b,
          reason: "Same venue and overlapping date/time window",
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return conflicts;
};

export const getAdminEvents = async (req, res) => {
  try {
    const { events, sources } = await getMasterEvents(eventFiltersFromQuery(req.query));
    const conflicts = detectEventConflicts(events);
    const conflictIds = new Set();
    conflicts.forEach((conflict) => {
      conflictIds.add(conflict.firstEvent.unifiedId);
      conflictIds.add(conflict.secondEvent.unifiedId);
    });
    const filteredEvents = req.query.conflictsOnly === "true"
      ? events.filter((event) => conflictIds.has(event.unifiedId))
      : events;
    const stats = filteredEvents.reduce((acc, event) => {
      acc.totalEvents += 1;
      const status = eventStatusForStats(event);
      if (status === "upcoming") acc.upcoming += 1;
      if (status === "live") acc.liveNow += 1;
      return acc;
    }, { totalEvents: 0, conflicts: conflicts.length, upcoming: 0, liveNow: 0 });
    const paged = paginateEvents(filteredEvents, req.query.page || 1, 50);
    res.json({ success: true, ...paged, sources, stats });
  } catch (err) {
    console.error("Admin master events error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch admin events" });
  }
};

export const updateAdminEvent = async (req, res) => {
  try {
    const [source, id] = String(req.params.unifiedId || "").split(":");
    let updated = null;

    if (source === "venue") {
      const eventHall = req.body?.eventHall || {};
      const venueUpdate = {
        ...(req.body.eventName !== undefined ? { eventName: req.body.eventName } : {}),
        ...(req.body.societyName !== undefined ? { societyName: req.body.societyName } : {}),
        ...(req.body.eventDate !== undefined ? { checkInDate: req.body.eventDate } : {}),
        ...(req.body.eventEndDate !== undefined ? { checkOutDate: req.body.eventEndDate } : {}),
        ...(req.body.eventTime !== undefined ? { checkInTime: req.body.eventTime } : {}),
        ...(req.body.checkOutTime !== undefined ? { checkOutTime: req.body.checkOutTime } : {}),
        ...(req.body.description !== undefined ? { description: req.body.description } : {}),
        ...(req.body.purpose !== undefined ? { purpose: req.body.purpose } : {}),
        ...(eventHall.hall !== undefined ? { hall: eventHall.hall } : {}),
        ...(eventHall.roomNo !== undefined ? { roomNo: eventHall.roomNo } : {}),
      };
      updated = await VenueBooking.findByIdAndUpdate(id, venueUpdate, { new: true, runValidators: true }).lean();
    } else if (source === "event") {
      updated = await EventCalendar.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).lean();
    } else {
      const baseUrl = source === "student" ? process.env.STUDENT_CALENDAR_API_URL : process.env.INSTITUTE_CALENDAR_API_URL;
      const response = await fetch(new URL(`api/integration/events/${id}`, `${String(baseUrl || "").replace(/\/$/, "")}/`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-calendar-api-key": process.env.CALENDAR_INTERNAL_API_KEY || "",
        },
        body: JSON.stringify(req.body),
      });
      const json = await response.json();
      if (!response.ok) return res.status(response.status).json(json);
      updated = json.data;
    }

    if (!updated) return res.status(404).json({ success: false, message: "Event not found" });
    invalidateMasterCalendarCache();
    try {
      getSocketIO().emit("master-calendar-updated", { action: "updated", unifiedId: req.params.unifiedId });
    } catch {}
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteAdminEvent = async (req, res) => {
  try {
    const [source, id] = String(req.params.unifiedId || "").split(":");
    const unifiedId = req.params.unifiedId;
    const hideUpdate = {
      hiddenFromMasterCalendar: true,
      hiddenFromMasterCalendarAt: new Date(),
      hiddenFromMasterCalendarBy: req.eventCalendarAdmin?.scope || "event-calendar-admin",
      hiddenFromMasterCalendarReason: req.body?.reason || "Hidden from Event Calendar Admin",
    };
    let hidden = null;

    if (source === "venue") {
      hidden = await VenueBooking.findByIdAndUpdate(id, hideUpdate, { new: true }).lean();
    } else if (source === "event") {
      hidden = await EventCalendar.findByIdAndUpdate(id, hideUpdate, { new: true }).lean();
    } else {
      hidden = await MasterEventCalendarOverride.findOneAndUpdate(
        { unifiedId },
        {
          $set: {
            unifiedId,
            sourceType: source,
            sourceId: id,
            hiddenFromMasterCalendar: true,
            hiddenAt: new Date(),
            hiddenBy: req.eventCalendarAdmin?.scope || "event-calendar-admin",
            hiddenReason: req.body?.reason || "Hidden from Event Calendar Admin",
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
    }

    if (!hidden) return res.status(404).json({ success: false, message: "Event not found" });
    invalidateMasterCalendarCache();
    try {
      getSocketIO().emit("master-calendar-updated", { action: "hidden", unifiedId: req.params.unifiedId });
    } catch {}
    res.json({ success: true, data: hidden, message: "Event hidden from Event Calendar. Original source was not changed." });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const resolveAdminEventConflict = async (req, res) => {
  try {
    const [source, id] = String(req.params.unifiedId || "").split(":");
    const resolutionUpdate = {
      conflictResolved: true,
      conflictResolvedAt: new Date(),
      conflictResolvedBy: req.eventCalendarAdmin?.scope || "event-calendar-admin",
      conflictResolutionRemarks: req.body?.remarks || "Resolved from Event Calendar Admin",
    };
    let updated = null;

    if (source === "venue") {
      updated = await VenueBooking.findByIdAndUpdate(id, resolutionUpdate, { new: true, runValidators: true }).lean();
    } else if (source === "event") {
      updated = await EventCalendar.findByIdAndUpdate(id, resolutionUpdate, { new: true, runValidators: true }).lean();
    } else {
      updated = await MasterEventCalendarOverride.findOneAndUpdate(
        { unifiedId: req.params.unifiedId },
        {
          $set: {
            unifiedId: req.params.unifiedId,
            sourceType: source,
            sourceId: id,
            ...resolutionUpdate,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
    }

    if (!updated) return res.status(404).json({ success: false, message: "Event not found" });
    invalidateMasterCalendarCache();
    try {
      getSocketIO().emit("master-calendar-updated", { action: "conflict-resolved", unifiedId: req.params.unifiedId });
    } catch {}
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const parseMinutes = (time) => {
  if (!time || typeof time !== "string") return null;
  const normalized = time.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return (hours * 60) + minutes;
};

const hasTimeOverlap = (first, second) => {
  const firstStart = parseMinutes(first.eventTime);
  const firstEnd = parseMinutes(first.checkOutTime);
  const secondStart = parseMinutes(second.eventTime);
  const secondEnd = parseMinutes(second.checkOutTime);

  if ([firstStart, firstEnd, secondStart, secondEnd].some((value) => value === null)) {
    return false;
  }

  return firstStart < secondEnd && secondStart < firstEnd;
};

export const getAdminConflicts = async (req, res) => {
  try {
    const { events } = await getMasterEvents({ recordType: "event" });
    const conflicts = detectEventConflicts(events);
    res.json({ success: true, conflicts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to detect conflicts" });
  }
};

export const getAdminEventById = async (req, res) => {
  const data = await getSourceEvent(req.params.unifiedId);
  if (!data) return res.status(404).json({ success: false, message: "Event not found" });
  res.json({ success: true, data });
};
