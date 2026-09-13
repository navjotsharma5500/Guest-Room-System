import mongoose from "mongoose";

// Immutable recovery snapshots. Never expire these records or booking markers:
// they are the durable evidence that a payment has already been applied.
const schema = new mongoose.Schema({
  idempotencyKey: { type: String, required: true, unique: true },
  requestHash: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: Number, remarks: String, paymentAttachments: [String],
  status: { type: String, enum: ["PENDING", "BOOKING_UPDATED", "BILL_CREATED", "COMPLETED"], default: "PENDING" },
  financialBefore: mongoose.Schema.Types.Mixed,
  financialAfter: mongoose.Schema.Types.Mixed,
  bookingSnapshot: mongoose.Schema.Types.Mixed,
  billSnapshot: mongoose.Schema.Types.Mixed,
  result: mongoose.Schema.Types.Mixed,
}, { timestamps: true, writeConcern: { w: "majority", j: true } });
export default mongoose.model("AdminBillOperation", schema);
