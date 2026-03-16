// guestBookingCancelled.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function guestBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        This is to inform you that your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been cancelled.
      </p>

      <div class="details-box">
        <div class="details-title">Cancelled Booking Details</div>

        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>

        <p>
          <strong>Check-in:</strong>
          ${formatDateIST(b.from)} ${b.checkInTime || ""}
        </p>

        <p>
          <strong>Check-out:</strong>
          ${formatDateIST(b.to)} ${b.checkOutTime || ""}
        </p>
      </div>

      ${
        b.cancelRemarks
          ? `
          <div class="details-box">
            <div class="details-title">Cancellation Reason</div>
            <p>${b.cancelRemarks}</p>
          </div>
        `
          : ""
      }

      <p>
        If you still require accommodation, you may submit a new request
        through the Guest Room Management portal with revised dates.
      </p>

      <p>
        We regret any inconvenience caused and appreciate your understanding.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
