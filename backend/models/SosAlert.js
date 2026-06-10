import mongoose from "mongoose";
import { baseSupportFields } from "./supportRequestSchemas.js";

const sosAlertSchema = new mongoose.Schema(
  {
    ...baseSupportFields,
    issueType: { type: String, default: "SOS", index: true },
    sirenActive: { type: Boolean, default: true, index: true },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    escalatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sosAlertSchema.index({ "hostel.name": 1, sirenActive: 1, createdAt: -1 });

export default mongoose.model("SosAlert", sosAlertSchema);
