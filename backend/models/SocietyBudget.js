// models/SocietyBudget.js
import mongoose from "mongoose";

// ─── Attachment sub-schema ────────────────────────────────────────────────────
const AttachmentSchema = new mongoose.Schema(
  {
    url:        { type: String, required: true },
    type:       { type: String, enum: ["image", "pdf"], required: true },
    filename:   { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Expense (immutable once created) ────────────────────────────────────────
const SocietyExpenseSchema = new mongoose.Schema(
  {
    societyId:   { type: String, required: true, index: true },
    societyName: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    amount:      { type: Number, required: true, min: 1 },
    attachments: { type: [AttachmentSchema], validate: [a => a.length >= 1 && a.length <= 5, "1–5 attachments required"] },
    spentBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    spentByName: { type: String },
    spentByRole: { type: String },
  },
  { timestamps: true }
);

// ─── Budget (one per society) ─────────────────────────────────────────────────
const SocietyBudgetSchema = new mongoose.Schema(
  {
    societyId:       { type: String, required: true, unique: true, index: true },
    societyName:     { type: String, required: true },
    coverImageUrl:   { type: String, default: null },
    totalAllocated:  { type: Number, default: 0, min: 0 },
    totalSpent:      { type: Number, default: 0, min: 0 },
    // balance is always derived: totalAllocated - totalSpent
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Virtual: balance (never stored)
SocietyBudgetSchema.virtual("balance").get(function () {
  return this.totalAllocated - this.totalSpent;
});

SocietyBudgetSchema.set("toJSON", { virtuals: true });
SocietyBudgetSchema.set("toObject", { virtuals: true });

// ─── Budget Audit Log ─────────────────────────────────────────────────────────
const SocietyBudgetLogSchema = new mongoose.Schema(
  {
    societyId:   { type: String, required: true, index: true },
    action:      { type: String, enum: ["ADD_BUDGET", "ADD_EXPENSE"], required: true },
    amount:      { type: Number, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId }, // expenseId or n/a
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    performedByName: { type: String },
    remark:      { type: String },
  },
  { timestamps: true }
);

export const SocietyBudget  = mongoose.model("SocietyBudget",    SocietyBudgetSchema);
export const SocietyExpense = mongoose.model("SocietyExpense",   SocietyExpenseSchema);
export const SocietyBudgetLog = mongoose.model("SocietyBudgetLog", SocietyBudgetLogSchema);