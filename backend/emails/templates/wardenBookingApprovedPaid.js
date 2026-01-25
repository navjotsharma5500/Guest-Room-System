// wardenBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function wardenBookingApprovedPaid(b) {
  const amount = b.totalAmount || b.amount || 0;

  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Warden,</p>

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
        <p><strong>Amount:</strong> ₹${amount}</p>
      </div>

      <p>
        The hostel caretaker has been instructed to verify the payment
        details at the time of guest reporting.
      </p>

      <p>
        This notification is shared for your information and official record.
      </p>
    `,
  });
}
