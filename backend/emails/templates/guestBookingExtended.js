// guestBookingExtended.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        This is to inform you that your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been <strong>successfully extended</strong>.
      </p>

      <p>
        The updated booking details are as follows:
      </p>

      <p>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Revised Check-out Date:</strong>
        ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
      </p>

      ${
        b.extendRemarks
          ? `<p><strong>Remarks:</strong> ${b.extendRemarks}</p>`
          : ""
      }

      <p>
        Kindly ensure that the room is vacated on or before the revised
        check-out time. If you require any assistance, please contact
        the hostel caretaker.
      </p>

      <p>
        We wish you a comfortable and pleasant stay.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
