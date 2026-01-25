// managerBookingExtended.js
import masterTemplate from "./masterTemplate.js";

export default function managerBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that the guest room booking for
        <strong>${b.guest}</strong> has been <strong>extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
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
        This email is shared for your information and official records.
      </p>
    `,
  });
}
