import VenueBooking from "../models/VenueBooking.js";
import VenueConfig from "../models/VenueConfig.js";
import { cloneDefaultVenueConfig } from "../utils/defaultVenueConfig.js";
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
  // Prefer the global document, otherwise the newest legacy config, in one read.
  const [config] = await VenueConfig.aggregate([
    { $match: { $or: [{ key: "global" }, { key: { $exists: false } }, { key: null }, { key: "" }] } },
    { $addFields: { integrationPriority: { $cond: [{ $eq: ["$key", "global"] }, 1, 0] } } },
    { $sort: { integrationPriority: -1, updatedAt: -1 } },
    { $limit: 1 },
    { $project: { mainTabs: 1 } },
  ]);
  const tabs = Array.isArray(config?.mainTabs) && config.mainTabs.length
    ? config.mainTabs
    : cloneDefaultVenueConfig();

  return tabs.flatMap((tab) =>
    (tab.sections || []).flatMap((section) => {
      // Every hall label this Section has ever been known by (current +
      // pre-rename aliases from renameVenueSection), so a legacy booking
      // stored under an old section label still reports this venue as
      // unavailable instead of silently allowing a double-booking after a
      // Section rename.
      const hallAliasNames = Array.from(
        new Set([section.label, ...(section.previousNames || [])].filter(Boolean).map(normalize))
      );

      return (section.rooms || []).map((room) => ({
        venueKey: `${tab.id}:${section.id}:${room.id}`,
        mainTabId: tab.id,
        mainTabLabel: normalize(tab.label),
        sectionId: section.id,
        sectionLabel: normalize(section.label),
        roomId: room.id,
        venueName: normalize(room.name),
        hall: normalize(section.label),
        roomNo: normalize(room.name),
        hallAliasNames,
        // Every name this room has ever been known by (current + pre-rename
        // aliases), so a legacy booking stored under an old name still
        // reports this venue as unavailable instead of silently allowing a
        // double-booking after a rename.
        aliasNames: Array.from(
          new Set([room.name, ...(room.previousNames || [])].filter(Boolean).map(normalize))
        ),
        enabled: tab.enabled !== false && section.enabled !== false && room.enabled !== false,
      }));
    })
  );
};

// Explicit public projection keeps alias history and internal fields private.
const publicVenue = (venue) => ({
  venueKey: venue.venueKey,
  mainTabId: venue.mainTabId,
  mainTabLabel: venue.mainTabLabel,
  sectionId: venue.sectionId,
  sectionLabel: venue.sectionLabel,
  roomId: venue.roomId,
  venueName: venue.venueName,
  enabled: venue.enabled,
});

export const getVenueCatalog = async (_req, res) => {
  try {
    const venues = await getVenueEntries();
    return res.json({ success: true, venues: venues.map(publicVenue) });
  } catch (error) {
    console.error("Venue integration catalog error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch venue catalog" });
  }
};

const hasConflict = (slot, venue, bookings) =>
  bookings.some(
    (booking) =>
      (venue.hallAliasNames || [venue.hall]).some(
        (aliasHall) => normalizeKey(booking.hall) === normalizeKey(aliasHall)
      ) &&
      (venue.aliasNames || [venue.roomNo]).some(
        (aliasName) => normalizeKey(booking.roomNo) === normalizeKey(aliasName)
      ) &&
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

    return res.json({
      success: true,
      slot,
      venues: venues.map((venue) => {
        const reason = !venue.enabled ? "DISABLED"
          : hasConflict(slot, venue, bookings) ? "BOOKED" : null;
        return { ...publicVenue(venue), available: reason === null, reason };
      }),
    });
  } catch (error) {
    console.error("Venue integration availability error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to check venue availability" });
  }
};
