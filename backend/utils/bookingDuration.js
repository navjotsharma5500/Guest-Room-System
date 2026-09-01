import { getIndiaDateKey } from "./bookingTransfer.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcMs = (dateKey) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * Count the calendar midnights crossed by a Direct Booking stay. India
 * calendar-day keys are converted to UTC solely for stable date arithmetic;
 * clock times do not contribute to the duration.
 *
 * This intentionally remains separate from shared billing, extension, and
 * continuous-stay helpers so their existing fallback behavior is unchanged.
 */
export const calculateBookingDurationDays = (from, to) => {
  const fromKey = getIndiaDateKey(from);
  const toKey = getIndiaDateKey(to);
  if (!fromKey || !toKey) return 0;

  const diffDays = Math.round((toUtcMs(toKey) - toUtcMs(fromKey)) / DAY_MS);
  return Math.max(0, diffDays);
};
