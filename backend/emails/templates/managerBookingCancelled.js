import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function managerBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that the guest room booking for
        <strong>${b.guest}</strong> has been <strong>successfully cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Cancellation Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${formatDateIST(b.from)} ${b.checkInTime || ""}
        </p>
        ${
          b.cancelRemarks
            ? `<p><strong>Cancellation Reason:</strong> ${b.cancelRemarks}</p>`
            : ""
        }
      </div>

      <p>
        This notification is issued for administrative reference and record-keeping.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
