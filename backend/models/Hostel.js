import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomNo: String,
  roomType: String
});

const hostelSchema = new mongoose.Schema({
  name: String,
  caretakerEmail: String,
  wardenEmail: String,
  rooms: [roomSchema]
});

export default mongoose.model("Hostel", hostelSchema);
