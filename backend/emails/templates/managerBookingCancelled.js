// managerBookingCancelled.js
import masterTemplate from "./masterTemplate.js";

export default function managerBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear Manager,</p>

      <p>
        Please note that the guest room booking for
        <strong>${b.guest}</strong> has been <strong>cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Cancellation Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p><strong>Reason:</strong> ${b.cancelRemarks || "Not specified"}</p>
      </div>

      <p>
        This notification is shared for your information and record.
      </p>
    `,
  });
}
