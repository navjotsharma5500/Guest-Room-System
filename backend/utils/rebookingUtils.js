import Booking from "../models/Booking.js";
import { getSystemSettings } from "./systemSettings.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const CONTINUOUS_STAY_WINDOW_HOURS = 24;
const DEFAULT_CONTINUOUS_STAY_LIMIT_DAYS = 3;

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();
const normalizeContact = (value = "") => String(value || "").trim();

const toDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const calculateStayDays = (checkInDate, checkoutDate) => {
  const start = toDateOnly(checkInDate);
  const end = toDateOnly(checkoutDate);
  if (!start || !end) return 1;
  const diff = Math.round((end - start) / DAY_MS);
  return Math.max(1, diff);
};

const getComparableCheckoutTimestamp = (booking) => {
  const timestamp =
    booking?.checkedOutAt ||
    booking?.actualCheckoutDate ||
    booking?.to;

  if (!timestamp) return null;

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const findLatestRelatedBooking = async ({
  email,
  contact,
  hostel,
  excludeBookingId = null,
}) => {
  const orConditions = [];
  const normalizedEmail = normalizeEmail(email);
  const normalizedContact = normalizeContact(contact);

  if (normalizedEmail) {
    orConditions.push({ email: normalizedEmail });
    orConditions.push({ email });
  }
  if (normalizedContact) {
    orConditions.push({ contact: normalizedContact });
    orConditions.push({ contact });
  }
  if (orConditions.length === 0) return null;

  const query = {
    hostel,
    status: { $in: ["booked", "checked_in", "checked_out"] },
    $or: orConditions,
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.findOne(query)
    .sort({ checkedOutAt: -1, actualCheckoutDate: -1, to: -1, createdAt: -1 })
    .lean();
};

export const evaluateContinuousStay = async ({
  email,
  contact,
  hostel,
  newFrom,
  newTo,
  excludeBookingId = null,
  limitDays = null,
}) => {
  const resolvedLimitDays =
    Number(limitDays) ||
    Number((await getSystemSettings())?.bookingDays?.caretakerMaxDirectBookingDays) ||
    DEFAULT_CONTINUOUS_STAY_LIMIT_DAYS;
  const latestBooking = await findLatestRelatedBooking({
    email,
    contact,
    hostel,
    excludeBookingId,
  });

  const freshStartDate = toDateOnly(newFrom);
  const freshTotalDays = calculateStayDays(newFrom, newTo);

  if (!latestBooking) {
    return {
      latestBooking: null,
      within24Hours: false,
      requiresApproval: freshTotalDays > resolvedLimitDays,
      continuousStay: {
        isContinuous: false,
        startDate: freshStartDate,
        totalDays: freshTotalDays,
        parentBookingId: null,
      },
    };
  }

  const latestCheckoutTimestamp = getComparableCheckoutTimestamp(latestBooking);
  const newCheckInTimestamp = new Date(newFrom);

  if (!latestCheckoutTimestamp || Number.isNaN(newCheckInTimestamp.getTime())) {
    return {
      latestBooking,
      within24Hours: false,
      requiresApproval: freshTotalDays > resolvedLimitDays,
      continuousStay: {
        isContinuous: false,
        startDate: freshStartDate,
        totalDays: freshTotalDays,
        parentBookingId: null,
      },
    };
  }

  const diffHours = (newCheckInTimestamp - latestCheckoutTimestamp) / (1000 * 60 * 60);
  const within24Hours = diffHours >= 0 && diffHours <= CONTINUOUS_STAY_WINDOW_HOURS;

  if (!within24Hours) {
    return {
      latestBooking,
      within24Hours: false,
      requiresApproval: freshTotalDays > resolvedLimitDays,
      continuousStay: {
        isContinuous: false,
        startDate: freshStartDate,
        totalDays: freshTotalDays,
        parentBookingId: null,
      },
    };
  }

  const chainStartDate = toDateOnly(
    latestBooking?.continuousStay?.startDate ||
      latestBooking?.actualCheckInDate ||
      latestBooking?.from
  ) || freshStartDate;

  const totalDays = calculateStayDays(chainStartDate, newTo);
  const previousDirectExtensionUsed = Boolean(latestBooking?.directExtension?.used);

  return {
    latestBooking,
    within24Hours,
    requiresApproval:
      previousDirectExtensionUsed || totalDays > resolvedLimitDays,
    requiresApprovalReason: previousDirectExtensionUsed
      ? "previous_direct_extension_used"
      : totalDays > resolvedLimitDays
        ? "continuous_stay_exceeded"
        : null,
    continuousStay: {
      isContinuous: true,
      startDate: chainStartDate,
      totalDays,
      parentBookingId:
        latestBooking?.continuousStay?.parentBookingId ||
        latestBooking?._id ||
        null,
    },
  };
};

export const setupRebookingApproval = (booking, evaluation) => {
  const continuousStay = evaluation?.continuousStay || {
    isContinuous: false,
    startDate: toDateOnly(booking.from),
    totalDays: calculateStayDays(booking.from, booking.to),
    parentBookingId: null,
  };

  booking.continuousStay = continuousStay;
  booking.isRebookingWithin24hrs = Boolean(evaluation?.within24Hours);

  if (evaluation?.requiresApproval) {
    booking.approvalStatus = "under_review";
    booking.reviewDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000);
  } else {
    booking.approvalStatus = "auto_approved";
    booking.reviewDeadline = null;
  }

  return booking;
};

export const getRemainingCaretakerDays = async (bookingLike, limitDays = null) => {
  const resolvedLimitDays =
    Number(limitDays) ||
    Number((await getSystemSettings())?.bookingDays?.caretakerMaxDirectBookingDays) ||
    DEFAULT_CONTINUOUS_STAY_LIMIT_DAYS;
  const totalDays = Number(bookingLike?.continuousStay?.totalDays || 0);
  const normalizedTotal = totalDays > 0 ? totalDays : calculateStayDays(bookingLike?.from, bookingLike?.to);
  return Math.max(0, resolvedLimitDays - normalizedTotal);
};

export const getMaxCaretakerCheckoutDate = async (bookingLike, limitDays = null) => {
  const resolvedLimitDays =
    Number(limitDays) ||
    Number((await getSystemSettings())?.bookingDays?.caretakerMaxDirectBookingDays) ||
    DEFAULT_CONTINUOUS_STAY_LIMIT_DAYS;
  const startDate = toDateOnly(
    bookingLike?.continuousStay?.startDate ||
      bookingLike?.actualCheckInDate ||
      bookingLike?.from
  );
  if (!startDate) return null;
  return addDays(startDate, resolvedLimitDays);
};

export {
  DEFAULT_CONTINUOUS_STAY_LIMIT_DAYS as CONTINUOUS_STAY_LIMIT_DAYS,
  CONTINUOUS_STAY_WINDOW_HOURS,
};

export default {
  calculateStayDays,
  evaluateContinuousStay,
  findLatestRelatedBooking,
  getMaxCaretakerCheckoutDate,
  getRemainingCaretakerDays,
  setupRebookingApproval,
};
