// guestBookingRejected.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingRejected(b) {
  return masterTemplate({
    title: "Guest Room Booking Request — Not Approved",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        Thank you for your request. After review, we regret to inform you that
        your guest room booking <strong>could not be approved</strong> due to
        current unavailability.
      </p>

      <div class="details-box">
        <div class="details-title">Requested Details</div>
        <p><strong>Hostel:</strong> ${b.hostel || "—"}</p>
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
        You may submit a new enquiry with alternate dates through the Guest Room
        portal, and we will be happy to assist you.
      </p>

      <p>Thank you for your understanding.</p>
    `,
  });
}
