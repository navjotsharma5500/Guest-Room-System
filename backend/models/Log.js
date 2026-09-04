import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    // `userId` and `details` are retained for backwards compatibility.
    kind: { type: String, enum: ["AUDIT", "REQUEST_TRACE", "CRON_JOB"], default: "AUDIT" },
    timestamp: { type: Date, default: Date.now, immutable: true },
    requestId: { type: String, trim: true },
    source: { type: String, enum: ["USER", "SYSTEM", "CRON"], default: "USER" },
    module: { type: String, trim: true, default: "SYSTEM" },
    action: { type: String, required: true, trim: true },
    functionName: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, trim: true },
    userEmail: { type: String, trim: true, lowercase: true },
    userRole: { type: String, trim: true },
    entityType: { type: String, trim: true },
    entityId: { type: String, trim: true },
    bookingId: { type: String, trim: true },
    guestName: { type: String, trim: true },
    guestEmail: { type: String, trim: true, lowercase: true },
    guestContact: { type: String, trim: true },
    hostel: { type: String, trim: true },
    roomNo: { type: String, trim: true },
    method: { type: String, trim: true },
    route: { type: String, trim: true },
    previousState: mongoose.Schema.Types.Mixed,
    newState: mongoose.Schema.Types.Mixed,
    remarks: { type: String, trim: true },
    result: { type: String, enum: ["SUCCESS", "FAILED"], default: "SUCCESS" },
    httpStatus: Number,
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    jobName: { type: String, trim: true },
    startedAt: Date,
    finishedAt: Date,
    durationMs: Number,
    recordsMatched: Number,
    recordsChanged: Number,
    error: { type: String, trim: true },
    details: mongoose.Schema.Types.Mixed,
    // Only request traces receive this field; audit events remain long-term.
    expiresAt: Date,
  },
  { strict: true, versionKey: false }
);

logSchema.index({ timestamp: -1 });
logSchema.index({ kind: 1, timestamp: -1 });
logSchema.index({ requestId: 1, timestamp: 1 });
logSchema.index({ bookingId: 1, timestamp: -1 });
logSchema.index({ action: 1, timestamp: -1 });
logSchema.index({ module: 1, source: 1, result: 1, timestamp: -1 });
logSchema.index({ userEmail: 1, timestamp: -1 });
logSchema.index({ hostel: 1, roomNo: 1, timestamp: -1 });
logSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export default mongoose.model("Log", logSchema);
