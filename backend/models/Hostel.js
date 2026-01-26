import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
  roomNo: { type: String, required: true },
  roomType: { type: String, default: "Guest Room" },
  caretakerEmail: { type: String },
  wardenEmail: { type: String },
  // bookings stay in Booking collection (not embedded)
});

const HostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    caretakerEmail: { type: String, required: true },
    wardenEmail: { type: String, required: true },
    active: { type: Boolean, default: true },
    rooms: [RoomSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Hostel", HostelSchema);