// models/Hostel.js
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomNo: { type: String, required: true },
  roomType: { type: String, required: true },
  bookings: { type: Array, default: [] }
});

const hostelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  caretakerEmail: { type: String },
  wardenEmail: { type: String },
  rooms: [roomSchema]
});

export default mongoose.model("Hostel", hostelSchema);
