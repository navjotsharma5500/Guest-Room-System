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
