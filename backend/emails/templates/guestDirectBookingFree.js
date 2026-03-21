// guestDirectBookingFree.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function guestDirectBookingFree(b) {
  return masterTemplate({
    title: "Guest Room Booking Confirmed",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        We are pleased to confirm your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been successfully arranged as a <strong>complimentary stay</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
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
        b.freeRemarks || b.remarks
          ? `
          <div class="details-box">
            <div class="details-title">Special Notes</div>
            <p>${b.freeRemarks || b.remarks}</p>
          </div>
        `
          : ""
      }

      <div class="details-box">
        <div class="details-title">Important Information</div>
        <ul>
          <li>Please report to the hostel at the scheduled check-in time</li>
          <li>Carry a valid government-issued photo ID</li>
          <li>Contact the hostel caretaker upon arrival for assistance</li>
        </ul>
      </div>

      <p>
        We look forward to welcoming you and wish you a comfortable stay.
      </p>

      <p>
        Warm regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
