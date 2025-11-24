import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalName: String,
  mimeType: String,
  size: Number,
  data: String, // base64
});

const enquirySchema = new mongoose.Schema(
  {
    // Basic Guest Info (from frontend)
    name: { type: String, required: true },     // guestName
    email: { type: String, required: true },    // guestEmail
    contact: { type: String, required: true },  // guestPhone

    // Optional fields
    purpose: String,   // message
    preferredDate: String,

    // FullData fields (flattened)
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

    // File uploads (base64 or multer)
    files: [fileSchema],

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Enquiry", enquirySchema);
