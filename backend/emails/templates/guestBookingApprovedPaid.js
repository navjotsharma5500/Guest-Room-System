// guestBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingApprovedPaid(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved (Paid)",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        Your <strong>paid guest room booking</strong> has been successfully
        <strong>approved</strong>. Please review the confirmed details below.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
        <p><strong>Amount Payable:</strong> ₹${b.amount}</p>
      </div>

      <div class="details-box">
        <div class="details-title">Payment Details</div>
        <p><strong>Bank Name:</strong> State Bank of India</p>
        <p><strong>Account Number:</strong> 65181840370</p>
        <p><strong>IFSC Code:</strong> SBIN0050244</p>
      </div>

      <p>
        After completing the payment, please <strong>share the payment slip</strong>
        by replying to this email or carry a copy when reporting at the hostel.
      </p>

      <p>
        On arrival, kindly report to the <strong>hostel caretaker</strong> for
        verification and room handover.
      </p>

      <p>We look forward to hosting you.</p>
    `,
  });
}
