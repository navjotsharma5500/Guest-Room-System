import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    guestName: { type: String, required: true },
    guestEmail: { type: String, required: true },
    guestPhone: { type: String, required: true },

    message: String,
    preferredDate: String,

    fullData: {
      rollno: String,
      department: String,
      gender: String,
      from: String,
      to: String,
      guests: String,
      females: String,
      males: String,
      state: String,
      city: String,
      reference: String,
      files: [String], // base64 strings
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Enquiry", enquirySchema);
