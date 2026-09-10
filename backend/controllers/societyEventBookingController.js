import crypto from "crypto";
import mongoose from "mongoose";
import VenueBooking from "../models/VenueBooking.js";
import SocietyEventBookingBatch from "../models/SocietyEventBookingBatch.js";
import SocietyVenueBookingLock from "../models/SocietyVenueBookingLock.js";
import { getVenueEntries, hasConflict, validateSlot } from "./venueIntegrationController.js";
import { getSocketIO } from "../utils/socket.js";

class IntegrationError extends Error {
  constructor(status, code, message) { super(message); Object.assign(this, { status, code }); }
}
const invalid = () => { throw new IntegrationError(400, "INVALID_REQUEST", "Invalid Society Portal event booking payload"); };
const shape = (value, keys) => {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) invalid();
};
const text = (value, max = 200) => {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) invalid();
  return value.trim();
};
const identifier = (value, max = 200) => {
  const result = text(value, max);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)) invalid();
  return result;
};
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

const validateRequest = body => {
  shape(body, ["sourceSystem", "eventId", "eventPublicId", "idempotencyKey", "eventName", "society", "requester", "venue", "schedule"]);
  if (body.sourceSystem !== "SOCIETY_PORTAL") invalid();
  shape(body.society, ["societyId", "name"]);
  shape(body.requester, ["name", "email"]);
  shape(body.venue, ["venueKey", "mainTabId", "sectionId", "roomId"]);
  const venue = {
    venueKey: identifier(body.venue.venueKey, 602),
    mainTabId: identifier(body.venue.mainTabId),
    sectionId: identifier(body.venue.sectionId),
    roomId: identifier(body.venue.roomId),
  };
  if ([venue.mainTabId, venue.sectionId, venue.roomId].some(id => id.includes(":"))
    || venue.venueKey !== `${venue.mainTabId}:${venue.sectionId}:${venue.roomId}`) invalid();
  const email = text(body.requester.email, 254).toLowerCase();
  if (!/^[^\s@]+@thapar\.edu$/.test(email)) invalid();
  if (!Array.isArray(body.schedule) || !body.schedule.length || body.schedule.length > 366) invalid();
  const schedule = body.schedule.map(day => {
    shape(day, ["date", "startTime", "endTime"]);
    const date = text(day.date, 10), startTime = text(day.startTime, 5), endTime = text(day.endTime, 5);
    if (validateSlot({ fromDate: date, toDate: date, startTime, endTime })) invalid();
    return { date, startTime, endTime };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(schedule.map(day => day.date)).size !== schedule.length) invalid();
  return {
    sourceSystem: "SOCIETY_PORTAL",
    eventId: identifier(body.eventId),
    eventPublicId: identifier(body.eventPublicId),
    idempotencyKey: identifier(body.idempotencyKey, 256),
    eventName: text(body.eventName),
    society: { societyId: identifier(body.society.societyId), name: text(body.society.name) },
    requester: { name: text(body.requester.name), email },
    venue, schedule,
  };
};

const replayResult = (batch, requestHash) => {
  if (batch.requestHash !== requestHash) {
    throw new IntegrationError(409, "IDEMPOTENCY_MISMATCH", "This event or idempotency key already has a different booking request");
  }
  return { ...batch.result, idempotentReplay: true };
};

export const bookSocietyEvent = async (req, res) => {
  let session;
  try {
    const input = validateRequest(req.body);
    const batchId = hash([input.sourceSystem, input.eventId]);
    const requestHash = hash(input);
    const batchMatch = { $or: [
      { _id: batchId },
      { sourceSystem: input.sourceSystem, integrationIdempotencyKey: input.idempotencyKey },
    ] };
    const existing = await SocietyEventBookingBatch.findOne(batchMatch).lean();
    if (existing) return res.status(200).json(replayResult(existing, requestHash));

    // Never attempt a non-atomic multi-document fallback on standalone MongoDB.
    // In that environment the safe fallback is zero writes and a retryable 503.
    const topology = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!topology.setName && topology.msg !== "isdbgrid") {
      throw new IntegrationError(503, "TRANSACTIONS_REQUIRED", "Event booking requires a transaction-capable MongoDB deployment");
    }
    // Ensure the unique key exists even when production disables autoIndex.
    await SocietyEventBookingBatch.createIndexes();
    try {
      await SocietyVenueBookingLock.updateOne({ _id: input.venue.venueKey }, { $setOnInsert: { revision: 0 } }, { upsert: true });
    } catch (error) {
      if (error.code !== 11000) throw error; // Another request initialized this lock.
    }
    session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        // This write is first: competing integrations cannot both read an empty
        // calendar snapshot and commit overlapping bookings for this venue.
        await SocietyVenueBookingLock.updateOne({ _id: input.venue.venueKey }, { $inc: { revision: 1 } }, { session });
        const previous = await SocietyEventBookingBatch.findOne(batchMatch).session(session).lean();
        if (previous) { result = replayResult(previous, requestHash); return; }

        const venues = await getVenueEntries({ session, requireStored: true });
        const venue = venues.find(entry => entry.venueKey === input.venue.venueKey
          && entry.mainTabId === input.venue.mainTabId && entry.sectionId === input.venue.sectionId && entry.roomId === input.venue.roomId);
        if (!venue) throw new IntegrationError(404, "VENUE_NOT_FOUND", "The selected venue does not exist");
        if (!venue.enabled) throw new IntegrationError(409, "VENUE_DISABLED", "The selected venue is disabled");

        const bookings = await VenueBooking.find({
          status: { $in: ["booked", "checked_in"] },
          checkInDate: { $lte: input.schedule.at(-1).date },
          checkOutDate: { $gte: input.schedule[0].date },
        }).select("hall roomNo checkInDate checkOutDate checkInTime checkOutTime").session(session).lean();
        if (input.schedule.some(day => hasConflict({ fromDate: day.date, toDate: day.date, startTime: day.startTime, endTime: day.endTime }, venue, bookings))) {
          throw new IntegrationError(409, "VENUE_NO_LONGER_AVAILABLE", "The selected venue is no longer available for the Event schedule.");
        }
        const documents = input.schedule.map(day => new VenueBooking({
          hall: venue.sectionLabel, roomNo: venue.venueName,
          venueMainTabId: venue.mainTabId, venueSectionId: venue.sectionId, venueRoomId: venue.roomId,
          name: input.requester.name, email: input.requester.email,
          eventName: input.eventName, societyName: input.society.name,
          checkInDate: day.date, checkOutDate: day.date, checkInTime: day.startTime, checkOutTime: day.endTime,
          status: "booked", bookingFor: "student_calendar",
          sourceSystem: input.sourceSystem, sourceEventId: input.eventId,
          sourceEventPublicId: input.eventPublicId, sourceSocietyId: input.society.societyId,
          integrationBatchId: batchId, integrationIdempotencyKey: input.idempotencyKey,
        }));
        // Validate every document before inserting any. The transaction also
        // rolls back server errors, partial inserts, and batch-record failures.
        for (const document of documents) await document.validate();
        await VenueBooking.insertMany(documents, { session, ordered: true });
        result = {
          success: true, sourceSystem: input.sourceSystem, eventId: input.eventId,
          eventPublicId: input.eventPublicId, venueKey: venue.venueKey, integrationBatchId: batchId,
          bookings: documents.map(document => ({ bookingId: String(document._id), date: document.checkInDate, startTime: document.checkInTime, endTime: document.checkOutTime })),
          idempotentReplay: false,
        };
        await SocietyEventBookingBatch.create([{
          _id: batchId, sourceSystem: input.sourceSystem, sourceEventId: input.eventId,
          integrationIdempotencyKey: input.idempotencyKey, requestHash, result,
        }], { session });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
    } catch (error) {
      // A different venue lock can still race on the same event/key. Mongo's
      // unique index aborts the losing transaction, including all of its days.
      if (error.code !== 11000) throw error;
      const previous = await SocietyEventBookingBatch.findOne(batchMatch).lean();
      if (!previous) throw error;
      result = replayResult(previous, requestHash);
    }
    if (!result.idempotentReplay) {
      try {
        // Existing dashboard/calendar listeners refetch on this event. Only
        // batch/booking IDs and requested slots are broadcast, once per commit.
        getSocketIO().emit("venueBookingCreated", { bookings: result.bookings, integrationBatchId: batchId, type: "venue", isolated: true });
      } catch { /* Dashboard polling remains the non-critical fallback. */ }
    }
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  } catch (error) {
    if (error instanceof IntegrationError) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    // Do not echo database errors, request data, or credentials.
    return res.status(503).json({ success: false, code: "BOOKING_INTEGRATION_UNAVAILABLE", message: "Unable to complete event booking; retry the same request" });
  } finally {
    if (session) await session.endSession();
  }
};
