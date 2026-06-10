import mongoose from "mongoose";
import { baseSupportFields } from "./supportRequestSchemas.js";

export const HEALTH_ISSUES = [
  "Fever",
  "Cold & Cough",
  "Headache",
  "Stomach Pain",
  "Food Poisoning",
  "Diarrhea",
  "Acidity",
  "Allergies",
  "Weakness",
  "Injury",
  "Stress",
  "Road Accident",
  "Other",
];

const medicalRequestSchema = new mongoose.Schema(
  {
    ...baseSupportFields,
    issueType: { type: String, enum: HEALTH_ISSUES, required: true, index: true },
  },
  { timestamps: true }
);

medicalRequestSchema.index({ "hostel.name": 1, status: 1, createdAt: -1 });

export default mongoose.model("MedicalRequest", medicalRequestSchema);
