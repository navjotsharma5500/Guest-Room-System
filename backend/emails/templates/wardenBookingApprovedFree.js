// wardenBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function wardenBookingApprovedFree(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Warden,</p>

      <p>
        A <strong>guest room booking</strong> has been approved for
        <strong>${b.guest}</strong>.
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
        The hostel caretaker has been notified to prepare the room and
        assist the guest on arrival.
      </p>

      <p>This message is shared for your information and record.</p>
    `,
  });
}
