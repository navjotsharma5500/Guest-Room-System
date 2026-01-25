// guestBookingCancelled.js
import masterTemplate from "./masterTemplate.js";

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

      <p>
        The booking details are provided below for your reference:
      </p>

      <p>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong>
        ${new Date(b.from).toDateString()} ${b.checkInTime || ""}<br/>
        <strong>Check-out:</strong>
        ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
      </p>

      ${
        b.cancelRemarks
          ? `<p><strong>Cancellation Reason:</strong> ${b.cancelRemarks}</p>`
          : ""
      }

      <p>
        If you still require accommodation, you may submit a new enquiry
        through the Guest Room Management portal with revised dates.
      </p>

      <p>
        We regret any inconvenience this may have caused.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
