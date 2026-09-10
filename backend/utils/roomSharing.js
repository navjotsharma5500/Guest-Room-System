import Booking from "../models/Booking.js";
import Hostel from "../models/Hostel.js";
import { bookingIntervalsOverlap, getCurrentSegmentStart, getBookingFinalCheckout, doesRangeOverlapMaintenanceBlock } from "./bookingTransfer.js";

export const ROOM_RESERVING_STATUSES = ["booked", "checked_in"];
export const sharingError = (message, code = "ROOM_BOOKING_CONFLICT", details = {}, statusCode = 409) =>
  Object.assign(new Error(message), { statusCode, code, ...details });

export const assertRoomScope = (user, hostel) => {
  const role = String(user?.role || "").toLowerCase();
  if (!["admin", "manager", "adosa", "co_warden", "caretaker", "warden"].includes(role) ||
      (["caretaker", "warden"].includes(role) && (user.assignedHostel || user.hostel) !== hostel)) {
    throw sharingError("You are not authorized to manage bookings in this hostel", "HOSTEL_ACCESS_DENIED", {}, 403);
  }
};

export const safeSharingMember = (b) => Object.fromEntries([
  "_id", "bookingId", "guest", "from", "to", "checkInTime", "checkOutTime", "status",
  "reportedStatus", "numGuests", "hostel", "roomNo",
].map(key => [key, b[key]]));

// Sweep half-open intervals. Departures and arrivals at the same instant are
// aggregated before checking the next positive-duration segment.
export const validateSharingIntervals = (candidate, bookings, capacity, { groupId = candidate.sharingGroupId, sourceId, requireOverlap = false } = {}) => {
  const start = getCurrentSegmentStart(candidate);
  const end = getBookingFinalCheckout(candidate);
  if (!start || !end || start >= end) throw sharingError("A valid positive stay interval is required", "INVALID_STAY", {}, 400);
  const guests = Number(candidate.numGuests ?? 1);
  if (!Number.isInteger(guests) || guests < 1) throw sharingError("Guest count must be a positive integer", "INVALID_GUEST_COUNT", {}, 400);
  const events = new Map([[+start, 0], [+end, 0]]);
  let overlap = false;
  for (const b of bookings) {
    if (String(b._id) === String(candidate._id) || !ROOM_RESERVING_STATUSES.includes(b.status)) continue;
    const bStart = getCurrentSegmentStart(b), bEnd = getBookingFinalCheckout(b);
    if (!bStart || !bEnd) throw sharingError("An existing reservation has invalid dates; review it before continuing");
    if (!bookingIntervalsOverlap(start, end, bStart, bEnd)) continue;
    const sameGroup = groupId && b.sharingGroupId && String(groupId) === String(b.sharingGroupId);
    if (!sameGroup && !(sourceId && String(sourceId) === String(b._id))) {
      throw sharingError("The room is already reserved for another booking during the requested extension period or stay.");
    }
    overlap = true;
    const count = Number(b.numGuests ?? 1);
    if (!Number.isInteger(count) || count < 1) throw sharingError("An existing reservation has an invalid guest count");
    const left = Math.max(+start, +bStart), right = Math.min(+end, +bEnd);
    events.set(left, (events.get(left) || 0) + count);
    events.set(right, (events.get(right) || 0) - count);
  }
  if (requireOverlap && !overlap) throw sharingError("This stay does not overlap the selected shared-room booking. Please create a normal Direct Booking.", "ROOM_SHARING_NO_OVERLAP", {}, 400);
  if (groupId || sourceId) {
    if (!Number.isInteger(capacity) || capacity < 1) throw sharingError("Room guest capacity is not configured", "INVALID_ROOM_CAPACITY", {}, 400);
    let occupiedGuests = 0;
    const points = [...events.keys()].sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i++) {
      occupiedGuests += events.get(points[i]);
      if (occupiedGuests + guests > capacity) throw sharingError("Room sharing guest capacity exceeded", "ROOM_SHARING_CAPACITY_EXCEEDED", {
        capacity, requestedGuests: guests, occupiedGuests,
        interval: { from: new Date(points[i]), to: new Date(points[i + 1]) },
      });
    }
  }
};

export const assertRoomStay = async (candidate, options = {}) => {
  const hostel = await Hostel.findOne({ name: candidate.hostel }).lean();
  const room = hostel?.rooms?.find(r => r.roomNo === candidate.roomNo);
  if (!room) throw sharingError("Hostel or room not found", "ROOM_NOT_FOUND", {}, 404);
  if (doesRangeOverlapMaintenanceBlock(room, candidate.from) || (room.isBlocked && !room.blockedTill)) {
    throw sharingError("Room is under maintenance during the requested stay", "ROOM_MAINTENANCE_CONFLICT", {}, 400);
  }
  const bookings = await Booking.find({ hostel: candidate.hostel, roomNo: candidate.roomNo, status: { $in: ROOM_RESERVING_STATUSES } }).lean();
  validateSharingIntervals(candidate, bookings, room.guestCapacity, options);
  return { room, bookings };
};

export const getReportingOccupancy = async (candidate) => {
  const hostel = await Hostel.findOne({ name: candidate.hostel }).lean();
  const room = hostel?.rooms?.find(r => r.roomNo === candidate.roomNo);
  if (!room) throw sharingError("Hostel or room not found", "ROOM_NOT_FOUND", {}, 404);
  const occupants = await Booking.find({ hostel: candidate.hostel, roomNo: candidate.roomNo,
    _id: { $ne: candidate._id }, status: { $in: ROOM_RESERVING_STATUSES },
    $or: [{ status: "checked_in" }, { reportedStatus: "reported" }],
  }).lean();
  const occupiedGuests = occupants.reduce((sum, b) => sum + Number(b.numGuests ?? 1), 0);
  const sharingAllowed = occupants.length > 0 && !!candidate.sharingGroupId && occupants.every(b =>
    b.sharingGroupId && String(b.sharingGroupId) === String(candidate.sharingGroupId) &&
    bookingIntervalsOverlap(getCurrentSegmentStart(candidate), getBookingFinalCheckout(candidate), getCurrentSegmentStart(b), getBookingFinalCheckout(b))) &&
    occupiedGuests + Number(candidate.numGuests ?? 1) <= room.guestCapacity;
  return { occupied: occupants.length > 0 && !sharingAllowed, occupant: occupants[0] ? safeSharingMember(occupants[0]) : null,
    sharingAllowed, occupants: occupants.map(safeSharingMember), capacity: room.guestCapacity, occupiedGuests, requestedGuests: Number(candidate.numGuests ?? 1) };
};

export const sendRoomError = (res, err) => res.status(err.statusCode || 500).json({ success: false, message: err.message,
  code: err.code, capacity: err.capacity, occupiedGuests: err.occupiedGuests, requestedGuests: err.requestedGuests, interval: err.interval });
