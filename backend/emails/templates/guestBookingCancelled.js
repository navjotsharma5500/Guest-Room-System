// guestBookingCancelled.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        This is to inform you that your guest room booking has been
        <strong>cancelled</strong>.
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
      </div>

      ${
        b.cancelRemarks
          ? `<p><strong>Reason:</strong> ${b.cancelRemarks}</p>`
          : ""
      }

      <p>
        If you still require accommodation, you may submit a new enquiry
        with revised dates through the Guest Room portal.
      </p>

      <p>We regret any inconvenience caused.</p>
    `,
  });
}
