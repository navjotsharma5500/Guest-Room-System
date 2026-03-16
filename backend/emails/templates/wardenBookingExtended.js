import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function wardenBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear Warden,</p>

      <p>
        This is to inform you that the guest room booking for
        <strong>${b.guest}</strong> has been <strong>extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Previous Check-out:</strong>
          ${b.previousTo ? formatDateIST(b.previousTo) : "As per earlier booking"}
        </p>
        <p>
          <strong>New Check-out:</strong>
          ${formatDateIST(b.to)} ${b.checkOutTime || ""}
        </p>
      </div>

      ${
        b.extendRemarks
          ? `<p><strong>Remarks:</strong> ${b.extendRemarks}</p>`
          : ""
      }

      <p>
        Kindly take note of the revised check-out date.
        The hostel caretaker and administration have been notified
        for necessary arrangements.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
