// guestBookingRejected.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingRejected(b) {
  return masterTemplate({
    title: "Guest Room Booking Request — Not Approved",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        Thank you for submitting your guest room booking request to
        <strong>Thapar Institute of Engineering and Technology</strong>.
      </p>

      <p>
        After careful review, we regret to inform you that the guest room
        could not be allotted as <strong>all hostels are fully occupied
        on the requested dates</strong>.
      </p>

      <p>
        <strong>Requested Check-in:</strong>
        ${new Date(b.from).toDateString()} ${b.checkInTime || ""}<br/>
        <strong>Requested Check-out:</strong>
        ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
      </p>

      <p>
        If you wish to book a guest room again, you may
        <strong>raise a new enquiry with different dates</strong>
        through the Guest Room Management portal, subject to availability.
      </p>

      <p>
        Thank you for your understanding and cooperation.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
