import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function managerBookingApprovedFree(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that a guest room booking has been
        <strong>successfully approved</strong> for the following guest.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
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

      <div class="details-box">
        <div class="details-title">Status</div>
        <p>
          The booking has been marked as <strong>Approved (Complimentary)</strong>
          in the Guest Room Management System.
        </p>
      </div>

      <p>
        This notification is shared for administrative reference and records.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
