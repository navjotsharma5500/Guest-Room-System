import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    // 🔒 SNAPSHOT (DO NOT reference Guest)
    guestName: String,
    guestEmail: String,
    guestContact: String,
    department: String,
    rollno: String,

    hostel: String,
    roomNo: String,

    billNumber: {
      type: String,
      required: true,
      unique: true
    },

    amountPaid: Number,
    paymentType: {
      type: String,
      enum: ["FULL", "PARTIAL"]
    },
    paymentMethod: String,
    transactionId: String,

    balanceBeforePayment: Number,
    balanceAfterPayment: Number,

    discountPercent: Number,
    discountAmount: Number,

    paymentProof: [String],
    remarks: String,

    pdfUrl: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Bill", billSchema);
