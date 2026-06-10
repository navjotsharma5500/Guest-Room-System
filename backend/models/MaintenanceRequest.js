import mongoose from "mongoose";
import { baseSupportFields } from "./supportRequestSchemas.js";

export const MAINTENANCE_CATEGORIES = ["Electrical", "Carpenter", "Plumber", "Mason"];

export const MAINTENANCE_SUBCATEGORIES = {
  Electrical: ["Light", "Fan", "Switch", "Socket", "MCB", "AC", "Geyser", "Other"],
  Carpenter: ["Door", "Window", "Bed", "Chair", "Table", "Cupboard", "Lock", "Other"],
  Plumber: ["Tap", "Flush", "Washbasin", "Shower", "Drainage", "Leakage", "Water Supply", "Other"],
  Mason: ["Wall", "Floor", "Tiles", "Seepage", "Ceiling", "Plaster", "Other"],
};

const maintenanceRequestSchema = new mongoose.Schema(
  {
    ...baseSupportFields,
    category: { type: String, enum: MAINTENANCE_CATEGORIES, required: true, index: true },
    subcategory: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

maintenanceRequestSchema.index({ "hostel.name": 1, status: 1, createdAt: -1 });

export default mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
