const INDIA_TIME_ZONE = "Asia/Kolkata";

export const getIndiaDateKey = (value) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const combineIndiaDateAndTime = (dateValue, timeValue) => {
  const dateKey = getIndiaDateKey(dateValue);
  const time = String(timeValue || "");
  const match = time.match(/^(\d{2}):(\d{2})$/);

  if (!dateKey || !match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const parsed = new Date(`${dateKey}T${time}:00+05:30`);
  if (Number.isNaN(parsed.getTime()) || getIndiaDateKey(parsed) !== dateKey) return null;
  return parsed;
};

export const getCurrentSegmentStart = (booking) => {
  const history = Array.isArray(booking?.transferHistory) ? booking.transferHistory : [];
  const latestSegmentEnd = history[history.length - 1]?.segmentTo;
  if (latestSegmentEnd) {
    const parsed = new Date(latestSegmentEnd);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return combineIndiaDateAndTime(
    booking?.from,
    booking?.checkInTime || "00:00"
  );
};

export const getBookingFinalCheckout = (booking) =>
  combineIndiaDateAndTime(
    booking?.to,
    booking?.checkOutTime || "23:59"
  );

export const bookingIntervalsOverlap = (startA, endA, startB, endB) =>
  startA < endB && endA > startB;
