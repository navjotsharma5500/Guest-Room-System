import mongoose from "mongoose";
import { baseSupportFields } from "./supportRequestSchemas.js";

export const CLEANING_COMPLAINTS = [
  "Guest Room Is Not Clean",
  "Bathroom Is Not Clean",
  "Bedsheets Are Dirty",
  "Dusting Required",
  "Room Smells Bad",
  "Other",
];

const cleaningRequestSchema = new mongoose.Schema(
  {
    ...baseSupportFields,
    complaintType: { type: String, enum: CLEANING_COMPLAINTS, required: true, index: true },
  },
  { timestamps: true }
);

cleaningRequestSchema.index({ "hostel.name": 1, status: 1, createdAt: -1 });

export default mongoose.model("CleaningRequest", cleaningRequestSchema);
