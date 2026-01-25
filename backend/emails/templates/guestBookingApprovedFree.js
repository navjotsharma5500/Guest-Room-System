// guestBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingApprovedFree(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        We are pleased to inform you that your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been approved.
      </p>

      <p>
        The confirmed details of your stay are as follows:
      </p>

      <p>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong>
        ${new Date(b.from).toDateString()} ${b.checkInTime || ""}<br/>
        <strong>Check-out:</strong>
        ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
      </p>

      <p>
        Kindly report to the hostel at the specified check-in time and
        contact the hostel caretaker for room allocation and assistance.
      </p>

      <p>
        Please carry any required identification or approval documents
        at the time of reporting.
      </p>

      <p>
        We wish you a comfortable and pleasant stay at the Institute.
      </p>

      <p>
        Warm regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
