import mongoose from "mongoose";

const HostelDataSchema = new mongoose.Schema({
  _id: { type: String, default: "hosteldata" },
  data: { type: Object, required: true }
});

export default mongoose.model("HostelData", HostelDataSchema);
