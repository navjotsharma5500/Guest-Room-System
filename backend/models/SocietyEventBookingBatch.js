import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
  // Hash of sourceSystem + eventId: Mongo's mandatory _id index enforces identity.
  _id: String,
  sourceSystem: { type: String, required: true, enum: ["SOCIETY_PORTAL"] },
  sourceEventId: { type: String, required: true },
  integrationIdempotencyKey: { type: String, required: true },
  requestHash: { type: String, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true, collection: "societyeventbookingbatches" });
batchSchema.index({ sourceSystem: 1, integrationIdempotencyKey: 1 }, { unique: true });

export default mongoose.models.SocietyEventBookingBatch
  || mongoose.model("SocietyEventBookingBatch", batchSchema);
