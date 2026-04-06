import VenueBooking from "../models/VenueBooking.js";

/**
 * ❌ DEPRECATED: Old continuous booking model
 * Check if two continuous time ranges overlap
 * @deprecated Use isDailySlotOverlapping instead
 */
const isTimeOverlapping = (newStart, newEnd, existStart, existEnd) => {
  return newStart < existEnd && newEnd > existStart;
};

/**
 * ✅ NEW: Convert HH:MM to minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * ✅ NEW: DAILY TIME SLOT OVERLAP CHECK (NEW MODEL)
 *
 * Two bookings conflict if BOTH conditions are true:
 * 1. DATE RANGES OVERLAP (dates intersect)
 * 2. DAILY TIME RANGES OVERLAP (times overlap on overlapping days)
 *
 * Examples:
 * - Booking A: Apr 5-7, 10:00-16:00
 * - Booking B: Apr 6-8, 10:00-16:00  → CONFLICT (dates & times overlap)
 * - Booking C: Apr 6-8, 16:00-22:00  → OK (times don't overlap: 10:00-16:00 vs 16:00-22:00)
 * - Booking D: Apr 8-10, 10:00-16:00 → OK (dates don't overlap: 5-7 vs 8-10)
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
  // Validate inputs
  if (!newStartDate || !newEndDate || !newDailyStart || !newDailyEnd) return false;
  if (!exStartDate || !exEndDate || !exDailyStart || !exDailyEnd) return false;

  // Parse dates as YYYY-MM-DD (local timezone)
  const parseDate = (d) => {
    if (typeof d !== "string") return NaN;
    const [year, month, day] = d.split("-").map(Number);
    if (!year || !month || !day) return NaN;
    return new Date(year, month - 1, day).getTime();
  };

  const newStart = parseDate(newStartDate);
  const newEnd = parseDate(newEndDate);
  const exStart = parseDate(exStartDate);
  const exEnd = parseDate(exEndDate);

  if (isNaN(newStart) || isNaN(newEnd) || isNaN(exStart) || isNaN(exEnd)) {
    return false;
  }

  // CONDITION 1: Date ranges must overlap
  // Overlap occurs if: newStart <= exEnd AND newEnd >= exStart
  const dateRangesOverlap = newStart <= exEnd && newEnd >= exStart;
  if (!dateRangesOverlap) {
    return false; // No date overlap = no conflict
  }

  // CONDITION 2: Daily times must overlap
  // Convert times to minutes since midnight for comparison
  const newDailyStartMin = timeToMinutes(newDailyStart);
  const newDailyEndMin = timeToMinutes(newDailyEnd);
  const exDailyStartMin = timeToMinutes(exDailyStart);
  const exDailyEndMin = timeToMinutes(exDailyEnd);

  // Overlap occurs if: newDailyStart < exDailyEnd AND newDailyEnd > exDailyStart
  const timesOverlap = newDailyStartMin < exDailyEndMin && newDailyEndMin > exDailyStartMin;

  // Return true only if BOTH date and time conditions are met
  return timesOverlap;
};

/**
 * ✅ NEW: Check venue booking conflicts using DAILY SLOT MODEL
 * @param {string} hall - Hall name
 * @param {string} roomNo - Room number  
 * @param {string} bookingStartDate - YYYY-MM-DD format (first day, inclusive)
 * @param {string} bookingEndDate - YYYY-MM-DD format (last day, inclusive)
 * @param {string} dailyStartTime - HH:MM format (24-hour, daily start time)
 * @param {string} dailyEndTime - HH:MM format (24-hour, daily end time)
 * @returns {Promise<object>} {hasConflict: bool, conflictWith?: {...}}
 *
 * Backward compat: Also accepts old field names (checkInDate, checkOutDate, checkInTime, checkOutTime)
 */
export const checkVenueConflict = async (
  hall,
  roomNo,
  bookingStartDate,
  bookingEndDate,
  dailyStartTime,
  dailyEndTime,
  // Backward compat: old field names
  checkInDate = bookingStartDate,
  checkOutDate = bookingEndDate,
  checkInTime = dailyStartTime,
  checkOutTime = dailyEndTime
) => {
  try {
    // Use new field names if provided, fall back to old ones
    const startDate = bookingStartDate || checkInDate;
    const endDate = bookingEndDate || checkOutDate;
    const startTime = dailyStartTime || checkInTime;
    const endTime = dailyEndTime || checkOutTime;

    // Validate inputs
    if (!hall || !roomNo || !startDate || !endDate || !startTime || !endTime) {
      throw new Error("Missing required parameters: hall, roomNo, dates, and times required");
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new Error("Invalid time format. Use HH:MM in 24-hour format");
    }

    // Date sanity check
    const startDateObj = new Date(startDate + "T00:00:00");
    const endDateObj = new Date(endDate + "T00:00:00");
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error("Invalid date values");
    }
    if (endDateObj < startDateObj) {
      throw new Error("End date must be >= start date");
    }

    // Time sanity check
    const startTimeMin = timeToMinutes(startTime);
    const endTimeMin = timeToMinutes(endTime);
    if (startTimeMin >= endTimeMin) {
      throw new Error("End time must be > start time");
    }

    // Query: Find bookings with SAME HALL + SAME ROOM + ACTIVE STATUS
    const bookings = await VenueBooking.find({
      hall: hall.trim(),
      roomNo: roomNo.trim(),
      status: { $in: ["booked", "checked_in"] },
    });

    // Check for overlaps using NEW daily slot model
    for (const booking of bookings) {
      const hasOverlap = isDailySlotOverlapping(
        startDate,
        endDate,
        startTime,
        endTime,
        booking.checkInDate,  // Use existing field names from DB
        booking.checkOutDate,
        booking.checkInTime,
        booking.checkOutTime
      );

      if (hasOverlap) {
        return {
          hasConflict: true,
          conflictWith: {
            id: booking._id,
            name: booking.name,
            startDate: booking.checkInDate,
            endDate: booking.checkOutDate,
            dailyStartTime: booking.checkInTime,
            dailyEndTime: booking.checkOutTime,
            // Legacy fields for backward compat
            start: `${booking.checkInDate} ${booking.checkInTime}`,
            end: `${booking.checkOutDate} ${booking.checkOutTime}`,
          },
        };
      }
    }

    return { hasConflict: false };
  } catch (error) {
    console.error("❌ checkVenueConflict error:", error);
    throw error;
  }
};
