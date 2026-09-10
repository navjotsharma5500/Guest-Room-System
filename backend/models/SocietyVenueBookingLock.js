import mongoose from "mongoose";

// A transaction updates this row before taking its booking snapshot. Concurrent
// integration requests for the same venue retry against the winning commit.
const lockSchema = new mongoose.Schema({
  _id: String,
  revision: { type: Number, default: 0 },
}, { versionKey: false, collection: "societyvenuebookinglocks" });

export default mongoose.models.SocietyVenueBookingLock
  || mongoose.model("SocietyVenueBookingLock", lockSchema);
