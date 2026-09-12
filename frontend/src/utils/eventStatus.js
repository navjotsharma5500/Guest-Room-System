import { getIndiaDateKey } from './dateUtils';

const DAY = 1440;
const timeMinutes = (value, fallback) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return fallback;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minutes > 59 || (period ? hours < 1 || hours > 12 : hours > 25)) return fallback;
  if (period) hours = hours % 12 + (period === 'PM' ? 12 : 0);
  return hours * 60 + minutes;
};

/** Campus lifecycle, independent of browser timezone and persisted booking state.
 * Checkout date is the final boundary for multi-day events, including overnight
 * slots. Legacy same-date overnight records roll checkout into the next morning:
 * calendar creation adds two hours (possibly 24/25) without advancing date.
 * Equal times do NOT roll over. End minutes are inclusive (17:00 is still live).
 * Missing times retain the calendars' midnight start / two-hour duration defaults.
 */
export const getEventStatus = (event, now = new Date()) => {
  const startDate = getIndiaDateKey(event.eventDate || event.startDate);
  const endDate = getIndiaDateKey(event.eventEndDate || event.endDate || startDate);
  if (!startDate || !endDate || !Number.isFinite(now.getTime())) return 'upcoming';
  const dayNumber = key => Date.parse(`${key}T00:00:00Z`) / 60000;
  const startDay = dayNumber(startDate);
  const endDay = dayNumber(endDate);
  const today = dayNumber(getIndiaDateKey(now));
  // Fixed IST offset; UTC getters here read an explicitly shifted campus clock.
  const campusClock = new Date(now.getTime() + 330 * 60000);
  const minutes = campusClock.getUTCHours() * 60 + campusClock.getUTCMinutes();
  const start = timeMinutes(event.eventTime, 0);
  const rawEnd = timeMinutes(event.checkOutTime, start + 120);
  const end = rawEnd % DAY;
  const overnight = rawEnd >= DAY || end < start;
  const finalEnd = endDay + (overnight && startDay === endDay ? DAY : 0) + end;
  const current = today + minutes;

  if (current > finalEnd) return 'completed';
  if (current < startDay + start) return 'upcoming';
  if (overnight) {
    if (minutes >= start || (today > startDay && minutes <= end)) return 'live';
    return 'upcoming';
  }
  if (minutes < start) return 'upcoming';
  if (minutes <= end) return 'live';
  return 'active';
};
