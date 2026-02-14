// guestBookingRejected.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingRejected(b) {
  return masterTemplate({
    title: "Guest Room Booking Request Not Approved",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        Thank you for your guest room booking request at
        <strong>Thapar Institute of Engineering and Technology</strong>.
      </p>

      <p>
        After careful consideration, we regret to inform you that your request
        could not be approved due to <strong>non-availability of rooms</strong>
        on the selected dates.
      </p>

      <div class="details-box">
        <div class="details-title">Requested Stay Details</div>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
      </div>

      <p>
        You are welcome to submit a new booking enquiry with alternative dates
        through the Guest Room Management Portal, subject to availability.
      </p>

      <p>
        We sincerely apologize for the inconvenience and appreciate your
        understanding.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
