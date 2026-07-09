// ============================================================
// FILE: models/Enquiry.js (FIXED)
// ============================================================
// BUG: Mongoose was not including checkInTime/checkOutTime
// in the JSON response due to schema serialization
// ============================================================

import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    // ✅ Basic guest information
    name: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: true },

    // ✅ Academic/Professional information
    rollno: { type: String, default: "" },
    department: { type: String, default: "" },
    gender: { type: String, default: "" },

    // ✅ Stay dates and times
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    checkInTime: { type: String, default: "00:00" },      // Format: "HH:MM"
    checkOutTime: { type: String, default: "23:59" },     // Format: "HH:MM"

    // ✅ Guest count breakdown
    guests: { type: Number, default: 0 },
    females: { type: Number, default: 0 },
    males: { type: Number, default: 0 },

    // ✅ Location information
    state: { type: String, default: "" },
    city: { type: String, default: "" },

    // ✅ Additional details
    purpose: { type: String, default: "" },
    reference: { type: String, default: "" },

    // ✅ Public booking workflow metadata
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel", default: null },
    roomId: { type: mongoose.Schema.Types.ObjectId, default: null },
    hostelName: { type: String, default: "" },
    roomName: { type: String, default: "" },
    bookingCategory: {
      type: String,
      enum: ["FacultyStaff", "ParentStudent", ""],
      default: "",
    },

    // ✅ Attached documents - ImageKit URLs
    files: { type: [String], default: [] },

    // ✅ Enquiry lifecycle
    status: {
      type: String,
      enum: [
        "pending",
        "pending-approval",
        "approved",
        "rejected",
        "booked",
      ],
      default: "pending",
    }
  },
  { timestamps: true }
);

// ✅ CRITICAL FIX: Ensure times are included in JSON response
enquirySchema.set('toJSON', {
  transform: (doc, ret) => {
    // Explicitly include these fields
    ret.checkInTime = doc.checkInTime || "00:00";
    ret.checkOutTime = doc.checkOutTime || "23:59";
    return ret;
  }
});

export default mongoose.model("Enquiry", enquirySchema);
