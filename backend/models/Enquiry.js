import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    guestName: { type: String, required: true },
    guestEmail: { type: String, required: true },
    guestPhone: { type: String, required: true },

    message: { type: String },
    preferredDate: { type: Date },

    status: {
      type: String,
      enum: ["new", "viewed", "converted", "ignored"],
      default: "new"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Enquiry", enquirySchema);
