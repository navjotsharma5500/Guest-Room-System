import Hostel from "../models/Hostel.js";
import RoomCleaningLog from "../models/RoomCleaningLog.js";
import { getSystemSettings } from "./systemSettings.js";

export const setRoomCleaningPending = async ({ hostel, roomNo, bookingId, io = null }) => {
  if (!hostel || !roomNo) return null;

  const settings = await getSystemSettings();
  if (
    settings?.operations?.enableCleaningWorkflow === false ||
    settings?.cleaning?.enableCleaningChecklist === false
  ) {
    return null;
  }

  const hostelDoc = await Hostel.findOne({ name: hostel });
  if (!hostelDoc) return null;

  const room = hostelDoc.rooms.find((item) => item.roomNo === roomNo);
  if (!room) return null;

  if (!room.isBlocked) {
    room.roomState = "cleaning_pending";
  }
  room.cleaningPendingSince = new Date();
  room.lastCheckoutBookingId = bookingId || null;
  await hostelDoc.save();

  const log = await RoomCleaningLog.findOneAndUpdate(
    {
      hostel,
      roomNo,
      bookingId: bookingId || null,
      status: { $in: ["pending", "checklist_submitted"] },
    },
    {
      $setOnInsert: {
        hostel,
        roomNo,
        bookingId: bookingId || null,
        status: "pending",
      },
    },
    { upsert: true, new: true }
  );

  const socket = io || global.io;
  if (socket) {
    socket.to("dashboard-room").emit("cleaning_pending", {
      hostel,
      roomNo,
      bookingId,
      roomState: room.roomState,
      timestamp: new Date().toISOString(),
    });
  }

  return log;
};
