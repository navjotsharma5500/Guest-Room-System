import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    contact: String,

    rollno: String,
    department: String,
    gender: String,

    from: Date,
    to: Date,
    guests: Number,
    females: Number,
    males: Number,
    state: String,
    city: String,

    reference: String,
    purpose: String,

    files: [
      {
        originalName: String,
        mimeType: String,
        size: Number,
        data: String
      }
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Enquiry", enquirySchema);
