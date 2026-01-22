// guestBookingExtended.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        Your guest room booking has been <strong>successfully extended</strong>.
        Please find the updated details below.
      </p>

      <div class="details-box">
        <div class="details-title">Updated Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>New Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
      </div>

      ${
        b.extendRemarks
          ? `<p><strong>Remarks:</strong> ${b.extendRemarks}</p>`
          : ""
      }

      <p>
        Kindly ensure that you vacate the room on or before the revised
        check-out time. For any assistance, please contact the hostel caretaker.
      </p>

      <p>We wish you a comfortable stay.</p>
    `,
  });
}
