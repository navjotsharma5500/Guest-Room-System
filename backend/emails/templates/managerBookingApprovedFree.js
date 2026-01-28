// managerBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function managerBookingApprovedFree(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that a guest room booking has been
        <strong>approved</strong> for the following guest.
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
      </div>

      <p>
        This email is shared for your information and official records.
      </p>
    `,
  });
}
