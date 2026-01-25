// managerBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function managerBookingApprovedPaid(b) {
  const amount = b.totalAmount || b.amount || 0;

  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that a guest room booking has been
        <strong>approved</strong> for <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
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
        <p><strong>Total Amount:</strong> ₹${amount}</p>
      </div>

      <p>
        The guest has been instructed to complete the payment and submit
        the payment receipt to the concerned hostel caretaker.
      </p>

      <p>
        This email is shared for your information and official records.
      </p>
    `,
  });
}
