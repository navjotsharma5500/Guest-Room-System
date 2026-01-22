// managerBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function managerBookingApprovedPaid(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that a <strong>paid guest room booking</strong>
        has been approved for <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Summary</div>
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
        <p><strong>Booking Type:</strong> Paid</p>
        <p><strong>Amount Payable:</strong> ₹${b.amount || b.totalAmount || 0}</p>
      </div>

      <p>
        The guest has been advised to complete the payment and share the
        payment receipt with the concerned hostel caretaker.
      </p>

      <p>
        This notification is shared for your information and records.
      </p>
    `,
  });
}
