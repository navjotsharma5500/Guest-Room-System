// src/utils/dateUtils.js

/**
 * ✅ Parse date as LOCAL date (prevents UTC / timezone shift bugs)
 */
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;

  // Already a Date object
  if (dateStr instanceof Date) return dateStr;

  // YYYY-MM-DD → local date
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // Fallback parsing
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * ✅ Combine date + time into ONE Date object (local time)
 */
export const combineDateAndTime = (dateStr, timeStr) => {
  if (!dateStr) return null;

  const date = parseLocalDate(dateStr);
  if (!date) return null;

  const t = timeStr && timeStr.length ? timeStr : "00:00";
  const [hours, minutes] = t.split(":").map(Number);

  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

/**
 * ✅ STRICT Date-Time Range Overlap Check
 *
 * Single rule used everywhere:
 * overlap = start1 < end2 && end1 > start2
 *
 * This correctly blocks:
 * - Ongoing bookings
 * - Multi-day bookings
 * - Mid-range overlaps
 * - Same-day time conflicts
 */
export const isDateTimeRangeOverlapping = (
  from1,
  to1,
  time1Start,
  time1End,
  from2,
  to2,
  time2Start,
  time2End
) => {
  const start1 = combineDateAndTime(from1, time1Start || "00:00");
  const end1   = combineDateAndTime(to1,   time1End   || "23:59");
  const start2 = combineDateAndTime(from2, time2Start || "00:00");
  const end2   = combineDateAndTime(to2,   time2End   || "23:59");

  if (!start1 || !end1 || !start2 || !end2) {
    return false;
  }

  return start1 < end2 && end1 > start2;
};

/**
 * ✅ Convert HH:MM to minutes since midnight
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * ✅ DAILY TIME SLOT OVERLAP CHECK (NEW MODEL)
 *
 * Two bookings conflict if BOTH conditions are true:
 * 1. DATE RANGES OVERLAP (dateRange check)
 * 2. DAILY TIME RANGES OVERLAP (time-of-day check)
 *
 * Example: Both date ranges [5-7] match, but times [10:00-16:00] vs [16:00-10:00 next day] = NO overlap
 */
export const isDailySlotOverlapping = (
  newStartDate,
  newEndDate,
  newDailyStart,
  newDailyEnd,
  exStartDate,
  exEndDate,
  exDailyStart,
  exDailyEnd
) => {
  if (!newStartDate || !newEndDate || !newDailyStart || !newDailyEnd) return false;
  if (!exStartDate || !exEndDate || !exDailyStart || !exDailyEnd) return false;

  // Parse dates as YYYY-MM-DD
  const parseDate = (d) => new Date(d + "T00:00:00").getTime();

  const newStart = parseDate(newStartDate);
  const newEnd = parseDate(newEndDate);
  const exStart = parseDate(exStartDate);
  const exEnd = parseDate(exEndDate);

  if (isNaN(newStart) || isNaN(newEnd) || isNaN(exStart) || isNaN(exEnd)) {
    return false;
  }

  // CONDITION 1: Date ranges must overlap
  // dateOverlap = newStart <= exEnd AND newEnd >= exStart
  const dateRangesOverlap = newStart <= exEnd && newEnd >= exStart;
  if (!dateRangesOverlap) {
    return false; // No date overlap = no conflict regardless of times
  }

  // CONDITION 2: Daily times must overlap (on each overlapping day)
  // timeOverlap = newDailyStart < exDailyEnd AND newDailyEnd > exDailyStart
  const newDailyStartMin = timeToMinutes(newDailyStart);
  const newDailyEndMin = timeToMinutes(newDailyEnd);
  const exDailyStartMin = timeToMinutes(exDailyStart);
  const exDailyEndMin = timeToMinutes(exDailyEnd);

  const timesOverlap = newDailyStartMin < exDailyEndMin && newDailyEndMin > exDailyStartMin;

  // Return true only if BOTH conditions are true
  return dateRangesOverlap && timesOverlap;
};

/**
 * ✅ India-timezone-safe calendar-day key ("YYYY-MM-DD"), regardless of the
 * viewer's browser timezone. Mirrors backend/utils/bookingTransfer.js so
 * block/booking date comparisons agree between frontend and backend.
 */
const INDIA_TIME_ZONE = "Asia/Kolkata";

export const getIndiaDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

/**
 * ✅ Maintenance block overlap check (date-only, inclusive of blockedTill's day).
 *
 * A room blocked until a given date/time remains unavailable through the END
 * of that calendar day (matches the backend's auto-unblock cron, which only
 * lifts the block once blockedTill's calendar date has fully passed). Any
 * stay whose check-in falls on/before that date overlaps the block; stays
 * starting after it are unaffected — regardless of how long they run.
 */
export const doesDateOverlapMaintenanceBlock = (room, fromStr) => {
  if (!room?.isBlocked || !room?.blockedTill) return false;
  const blockEndKey = getIndiaDateKey(room.blockedTill);
  const fromKey = getIndiaDateKey(fromStr);
  if (!blockEndKey || !fromKey) return false;
  return fromKey <= blockEndKey;
};

/**
 * ✅ Count the calendar midnights crossed by a Direct Booking stay.
 * India calendar-day keys are converted to UTC solely for stable date
 * arithmetic, so clock times never add another day.
 */
export const calculateBookingDurationDays = (fromStr, toStr) => {
  const fromKey = getIndiaDateKey(fromStr);
  const toKey = getIndiaDateKey(toStr);
  if (!fromKey || !toKey) return 0;

  const toUtcMs = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };

  const diffDays = Math.round((toUtcMs(toKey) - toUtcMs(fromKey)) / (24 * 60 * 60 * 1000));
  return Math.max(0, diffDays);
};

/**
 * ✅ Format time to HH:MM AM/PM (GuestDetails UI)
 */
export const formatTimeWithAMPM = (timeStr) => {
  if (!timeStr) return "—";

  const [hours, minutes] = String(timeStr).split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  const ampm = hours >= 12 ? "PM" : "AM";
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;

  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )} ${ampm}`;
};
