// guestDirectBookingFree.js
import masterTemplate from "./masterTemplate.js";

export default function guestDirectBookingFree(b) {
  return masterTemplate({
    title: "Guest Room Booking Confirmed",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        This is to confirm that your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been <strong>successfully confirmed</strong> as a complimentary stay.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
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
        b.freeRemarks || b.remarks
          ? `
          <div class="details-box">
            <div class="details-title">Special Notes</div>
            <p>${b.freeRemarks || b.remarks}</p>
          </div>
        `
          : ""
      }

      <p><strong>Important Instructions:</strong></p>
      <ul>
        <li>Please report to the hostel at the specified check-in time</li>
        <li>Carry a valid government-issued photo ID</li>
        <li>Contact the hostel caretaker upon arrival for room allocation</li>
      </ul>

      <p>
        We look forward to hosting you and wish you a pleasant stay.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
