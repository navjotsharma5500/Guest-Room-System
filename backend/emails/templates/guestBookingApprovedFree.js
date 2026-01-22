// guestBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingApprovedFree(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        Your guest room booking has been <strong>approved</strong>.
        Please find the confirmed details below.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
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
        <p><strong>Booking Type:</strong> Free</p>
      </div>

      <p>
        Please report to the hostel at the specified check-in time and meet
        the hostel caretaker for room allocation and assistance.
      </p>

      <p>
        If you have any supporting documents or approvals, kindly carry them
        along at the time of reporting.
      </p>

      <p>We wish you a comfortable stay.</p>
    `,
  });
}
