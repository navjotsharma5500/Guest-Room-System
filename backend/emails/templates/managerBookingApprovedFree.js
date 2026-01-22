// managerBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function managerBookingApprovedFree(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that a <strong>free guest room booking</strong>
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
        <p><strong>Booking Type:</strong> Free</p>
      </div>

      <p>
        This notification is shared for your information and records.
      </p>
    `,
  });
}
