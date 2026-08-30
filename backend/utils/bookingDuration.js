import { getIndiaDateKey } from "./bookingTransfer.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcMs = (dateKey) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * Inclusive calendar-day count for a date-only stay range (both endpoints
 * counted, e.g. 2026-09-28 → 2026-10-02 = 5 days). Timezone-safe via India
 * calendar-day keys — avoids off-by-one drift from server/browser timezone
 * or UTC conversion.
 *
 * This is specifically for the Direct Booking "maximum duration" rule.
 * It is intentionally separate from calculateStayDays (utils/rebookingUtils.js),
 * which counts nights (exclusive) for continuous-stay/rebooking/extension logic —
 * changing that shared function's semantics would ripple into unrelated billing
 * and rebooking behavior.
 */
export const calculateInclusiveStayDays = (from, to) => {
  const fromKey = getIndiaDateKey(from);
  const toKey = getIndiaDateKey(to);
  if (!fromKey || !toKey) return 0;

  const diffDays = Math.round((toUtcMs(toKey) - toUtcMs(fromKey)) / DAY_MS);
  return Math.max(1, diffDays + 1);
};
