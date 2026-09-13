import Booking from "../models/Booking.js";
import Bill from "../models/Bill.js";
import AdminBillOperation from "../models/AdminBillOperation.js";
import { resolveBillStayPeriod } from "../utils/billingDates.js";

const durable = { writeConcern: { w: "majority", j: true } };
const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const fail = (status, message, code) => { throw Object.assign(new Error(message), { status, code }); };

export async function resumeAdminBill({ key, requestHash, billId, bookingId, userId, payment, remarks, paymentAttachments, saveBillPDF }) {
  // Explicitly ensure duplicate barriers exist even when production autoIndex is disabled.
  await AdminBillOperation.collection.createIndex({ idempotencyKey: 1 }, { unique: true });
  await Bill.collection.createIndex({ adminBillOperationId: 1 }, { unique: true, sparse: true });
  let op = await AdminBillOperation.findOne({ idempotencyKey: key });
  if (!op) {
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) fail(404, "Booking not found");
    if (!["active", "booked", "checked_in", "checked_out"].includes(booking.status)) fail(400, "Bills cannot be created for cancelled, no-show or inactive bookings");
    const total = round(booking.totalAmount || 0), paid = round(booking.paidAmount || 0), discount = Number(booking.discount) || 0;
    if (![total, paid, discount].every(v => Number.isFinite(v) && v >= 0 && Number.isSafeInteger(Math.round(v * 100))) || paid + discount > total + 0.005) fail(400, "Invalid booking financial state");
    const balance = round(Math.max(0, total - paid - discount));
    if (balance > 0 && payment > balance) fail(400, `Amount exceeds the pending balance of ₹${balance.toFixed(2)}. Settle this balance before creating an additional bill.`);
    const before = {};
    for (const field of ["totalAmount", "amount", "paidAmount", "discount", "balanceAmount", "paymentStatus", "status", "__v", "paymentRemarks", "paymentAttachments"]) {
      before[field] = booking[field] === undefined ? { $exists: false } : booking[field];
    }
    const after = { totalAmount: balance === 0 ? round(total + payment) : total, paidAmount: round(paid + payment), balanceAmount: balance === 0 ? 0 : round(balance - payment) };
    if (![after.totalAmount, after.paidAmount].every(v => Number.isSafeInteger(Math.round(v * 100)))) fail(400, "Result exceeds supported currency range");
    if (balance === 0) after.amount = after.totalAmount;
    after.paymentStatus = after.balanceAmount === 0 ? "PAID" : "PARTIALLY_PAID";
    after.paymentRemarks = remarks;
    after.paymentAttachments = [...(booking.paymentAttachments || []), ...paymentAttachments];
    const snapshot = { ...booking, ...after };
    const period = resolveBillStayPeriod(snapshot, { previousPaidAmount: paid, previousDiscount: discount });
    const billSnapshot = {
      _id: billId, adminBillOperationId: billId, adminRequestHash: requestHash,
      billNumber: `ADM-${billId}`, bookingId, guestName: booking.guest, guestEmail: booking.email,
      guestContact: booking.contact, department: booking.department || "", rollno: booking.rollno || "",
      hostel: booking.hostel, roomNo: booking.roomNo, from: period.from, to: period.to,
      billType: "ADMIN_MANUAL_PAYMENT", totalAmount: balance === 0 ? payment : balance,
      amountPaid: payment, paymentType: after.balanceAmount === 0 ? "FULL" : "PARTIAL",
      paymentMethod: "Admin Manual Entry", paymentProof: paymentAttachments, remarks,
      balanceBeforePayment: balance === 0 ? payment : balance, balanceAfterPayment: after.balanceAmount,
      createdBy: userId, discountAmount: 0, discountPercent: 0,
    };
    try {
      op = await AdminBillOperation.create({ _id: billId, idempotencyKey: key, requestHash, bookingId, createdBy: userId,
        amount: payment, remarks, paymentAttachments, financialBefore: before, financialAfter: after,
        bookingSnapshot: snapshot, billSnapshot });
    } catch (error) {
      if (error.code !== 11000) throw error;
      op = await AdminBillOperation.findOne({ idempotencyKey: key });
      if (!op) throw error;
    }
  }
  if (op.requestHash !== requestHash) fail(409, "This retry key was already used with different bill details", "IDEMPOTENCY_MISMATCH");
  if (op.status === "COMPLETED") return { ...op.result, idempotentReplay: true };
  // The marker and money MUST be in the same single-document atomic write.
  // Status alone cannot close the crash window between booking and operation writes.
  const applied = await Booking.updateOne({ _id: op.bookingId, ...op.financialBefore, adminBillOperations: { $ne: op._id } }, {
    $set: op.financialAfter, $addToSet: { adminBillOperations: op._id }, $inc: { __v: 1 },
  }, durable);
  if (!applied.matchedCount && !await Booking.exists({ _id: op.bookingId, adminBillOperations: op._id })) {
    fail(409, "Booking changed before this payment was applied. Refresh and start a new operation.", "BOOKING_CHANGED");
  }
  await AdminBillOperation.updateOne({ _id: op._id, status: "PENDING" }, { $set: { status: "BOOKING_UPDATED" } }, durable);
  let bill = await Bill.findOne({ adminBillOperationId: op._id });
  if (!bill) {
    try { [bill] = await Bill.create([op.billSnapshot], durable); }
    catch (error) {
      if (error.code !== 11000) throw error;
      bill = await Bill.findOne({ adminBillOperationId: op._id });
      if (!bill) throw error;
    }
  }
  await AdminBillOperation.updateOne({ _id: op._id, status: "BOOKING_UPDATED" }, { $set: { status: "BILL_CREATED" } }, durable);
  if (!bill.pdfUrl) await saveBillPDF(op.bookingSnapshot, bill, { strict: true });
  const result = { success: true, message: "Bill created successfully", booking: op.bookingSnapshot, bill: bill.toObject(), remainingBalance: op.financialAfter.balanceAmount };
  const completed = await AdminBillOperation.updateOne({ _id: op._id, status: "BILL_CREATED" }, { $set: { status: "COMPLETED", result } }, durable);
  return { ...result, ...(!completed.modifiedCount ? { idempotentReplay: true } : {}) };
}
