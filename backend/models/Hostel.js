import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
  id: String,
  guest: String,
  rollno: String,
  department: String,
  contact: String,
  email: String,
  gender: String,
  state: String,
  city: String,
  purpose: String,
  reference: String,
  paymentType: String,
  amount: Number,
  numGuests: Number,
  females: Number,
  males: Number,
  from: String,
  to: String,
  files: Array
});

const RoomSchema = new mongoose.Schema({
  roomNo: String,
  roomType: String,
  bookings: [BookingSchema]
});

const HostelSchema = new mongoose.Schema({
  name: String,
  rooms: [RoomSchema]
});

const Hostel = mongoose.model("Hostel", HostelSchema);

export default Hostel;
