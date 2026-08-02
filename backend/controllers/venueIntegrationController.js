import VenueBooking from "../models/VenueBooking.js";
import VenueConfig from "../models/VenueConfig.js";
import VenueEnquiry from "../models/VenueEnquiry.js";
import { sendEnquirySubmittedEmail } from "../emails/venueEmailService.js";
import { asyncSendEmails } from "../utils/asyncEmail.js";
import { cloneDefaultVenueConfig } from "../utils/defaultVenueConfig.js";
import { getSocketIO } from "../utils/socket.js";
import { isDailySlotOverlapping } from "../utils/venueConflictChecker.js";

const ACTIVE_BOOKING_STATUSES = ["booked", "checked_in"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const normalize = (value) => String(value || "").trim();
const normalizeKey = (value) => normalize(value).toLocaleLowerCase("en-IN");

const parseDate = (value) => {
  if (!DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const validateSlot = ({ fromDate, toDate, startTime, endTime }) => {
  const startDate = parseDate(fromDate);
  const endDate = parseDate(toDate);

  if (!startDate || !endDate) return "Dates must use YYYY-MM-DD format";
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    return "Times must use HH:MM 24-hour format";
  }
  if (endDate < startDate) return "toDate must be on or after fromDate";
  if (endTime <= startTime) return "endTime must be after startTime";
  return null;
};

const getVenueEntries = async () => {
  const config = await VenueConfig.findOne().sort({ updatedAt: -1 }).lean();
  const tabs = Array.isArray(config?.mainTabs) && config.mainTabs.length
    ? config.mainTabs
    : cloneDefaultVenueConfig();

  return tabs.flatMap((tab) =>
    (tab.sections || []).flatMap((section) =>
      (section.rooms || []).map((room) => ({
        venueName: normalize(room.name),
        hall: normalize(section.label),
        roomNo: normalize(room.name),
        enabled: tab.enabled !== false && section.enabled !== false && room.enabled !== false,
      }))
    )
  );
};

const hasConflict = (slot, venue, bookings) =>
  bookings.some(
    (booking) =>
      normalizeKey(booking.hall) === normalizeKey(venue.hall) &&
      normalizeKey(booking.roomNo) === normalizeKey(venue.roomNo) &&
      isDailySlotOverlapping(
        slot.fromDate,
        slot.toDate,
        slot.startTime,
        slot.endTime,
        booking.checkInDate,
        booking.checkOutDate,
        booking.checkInTime,
        booking.checkOutTime
      )
  );

export const getVenueAvailability = async (req, res) => {
  try {
    const slot = {
      fromDate: normalize(req.query.fromDate),
      toDate: normalize(req.query.toDate),
      startTime: normalize(req.query.startTime),
      endTime: normalize(req.query.endTime),
    };
    const validationError = validateSlot(slot);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const [venues, bookings] = await Promise.all([
      getVenueEntries(),
      VenueBooking.find({
        status: { $in: ACTIVE_BOOKING_STATUSES },
        checkInDate: { $lte: slot.toDate },
        checkOutDate: { $gte: slot.fromDate },
      })
        .select("hall roomNo checkInDate checkOutDate checkInTime checkOutTime")
        .lean(),
    ]);

    return res.json(
      venues.map((venue) => ({
        venueName: venue.venueName,
        available: venue.enabled && !hasConflict(slot, venue, bookings),
      }))
    );
  } catch (error) {
    console.error("Venue integration availability error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to check venue availability" });
  }
};

export const createVenueBookingRequest = async (req, res) => {
  try {
    const payload = {
      venueName: normalize(req.body.venueName),
      fromDate: normalize(req.body.fromDate),
      toDate: normalize(req.body.toDate),
      startTime: normalize(req.body.startTime),
      endTime: normalize(req.body.endTime),
      societyName: normalize(req.body.societyName),
      eventName: normalize(req.body.eventName),
      studentName: normalize(req.body.studentName),
      studentEmail: normalize(req.body.studentEmail).toLowerCase(),
      contactNumber: normalize(req.body.contactNumber),
    };

    const requiredFields = Object.entries(payload).filter(([, value]) => !value).map(([key]) => key);
    if (requiredFields.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${requiredFields.join(", ")}`,
      });
    }

    const validationError = validateSlot(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    if (!/^\S+@\S+\.\S+$/.test(payload.studentEmail)) {
      return res.status(400).json({ success: false, message: "studentEmail must be a valid email address" });
    }
    if (!/^\d{10}$/.test(payload.contactNumber)) {
      return res.status(400).json({ success: false, message: "contactNumber must contain exactly 10 digits" });
    }

    const venues = await getVenueEntries();
    const matches = venues.filter(
      (venue) => venue.enabled && normalizeKey(venue.venueName) === normalizeKey(payload.venueName)
    );
    if (!matches.length) {
      return res.status(404).json({ success: false, message: "Venue not found or unavailable" });
    }
    if (matches.length > 1) {
      return res.status(409).json({ success: false, message: "Venue name is ambiguous" });
    }

    const venue = matches[0];
    const bookings = await VenueBooking.find({
      status: { $in: ACTIVE_BOOKING_STATUSES },
      checkInDate: { $lte: payload.toDate },
      checkOutDate: { $gte: payload.fromDate },
    }).lean();

    if (hasConflict(payload, venue, bookings)) {
      return res.status(409).json({ success: false, message: "Venue is unavailable for the requested slot" });
    }

    const enquiry = await VenueEnquiry.create({
      name: payload.studentName,
      email: payload.studentEmail,
      contact: payload.contactNumber,
      hall: venue.hall,
      roomNo: venue.roomNo,
      societyName: payload.societyName,
      eventName: payload.eventName,
      description: `Submitted through Society Night Pass for ${payload.eventName}`,
      purpose: payload.eventName,
      checkInDate: payload.fromDate,
      checkInTime: payload.startTime,
      checkOutDate: payload.toDate,
      checkOutTime: payload.endTime,
      status: "pending",
      submittedAt: new Date(),
    });

    try {
      getSocketIO().to("dashboard-room").emit("venue-enquiry-created", { enquiry });
    } catch (socketError) {
      console.error("Venue integration socket notification failed:", socketError.message);
    }
    asyncSendEmails(() => sendEnquirySubmittedEmail(enquiry));

    return res.status(201).json({
      success: true,
      message: "Venue enquiry submitted successfully",
      enquiryId: enquiry._id,
      status: enquiry.status,
    });
  } catch (error) {
    console.error("Venue integration booking request error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to submit venue enquiry" });
  }
};
