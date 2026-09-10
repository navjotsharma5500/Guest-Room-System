import mongoose from "mongoose";
import ExtensionRequest from "../models/ExtensionRequest.js";
import Booking from "../models/Booking.js";
import { sendRoomError, sharingError } from "../utils/roomSharing.js";

// No TTL: an expired lease must never let two writers reserve the same room.
// A process crash leaves a fail-closed lock for operator recovery.
const RoomBookingLock = mongoose.model("RoomBookingLock", new mongoose.Schema({
  _id: String, createdAt: { type: Date, default: Date.now },
}));

export const withRoomBookingLock = (handler) => async (req, res) => {
  const originalJson = res.json;
  let responseBody;
  let hasResponse = false;
  res.json = function (body) { responseBody = body; hasResponse = true; return this; };
  const acquired = [];
  const release = async () => {
    for (const _id of acquired.splice(0)) await RoomBookingLock.deleteOne({ _id });
  };
  try {
    const extension = req.body?.requestId && mongoose.isValidObjectId(req.body.requestId)
      ? await ExtensionRequest.findById(req.body.requestId).lean() : null;
    const bookingId = req.params.id || req.params.sourceBookingId || extension?.bookingId;
    const booking = bookingId && mongoose.isValidObjectId(bookingId) ? await Booking.findById(bookingId).lean() : null;
    const rooms = [booking, req.body, { hostel: req.body?.toHostel, roomNo: req.body?.toRoomNo }]
      .filter(b => b?.hostel && b?.roomNo).map(b => JSON.stringify([b.hostel, b.roomNo]));
    for (const _id of [...new Set(rooms)].sort()) {
      try { await RoomBookingLock.create({ _id }); acquired.push(_id); }
      catch (error) {
        if (error.code === 11000) throw sharingError("This room is being updated. Please retry.", "ROOM_UPDATE_IN_PROGRESS");
        throw error;
      }
    }
    await handler(req, res);
  } catch (error) {
    sendRoomError(res, error);
  } finally {
    try { await release(); }
    catch (error) { console.error("ROOM_LOCK_RELEASE_FAILED", error.message); }
    res.json = originalJson;
  }
  if (hasResponse && !res.destroyed) return res.json(responseBody);
};
