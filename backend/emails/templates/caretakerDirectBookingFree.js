// caretakerDirectBookingFree.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerDirectBookingFree(b) {
  return masterTemplate({
    title: `Direct Guest Room Booking — ${b.guest}`,
    content: `
      <p style="margin-top:0;">Dear Caretaker,</p>

      <p>
        A <strong>complimentary direct guest room booking</strong> has been created successfully. 
        Please review the booking details below.
      </p>

      <!-- BOOKING DETAILS -->
      <div style="
        background:#f8fafc;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        text-align:left;
        font-size:14.5px;
      ">

        <div style="font-weight:600;margin-bottom:10px;color:#0f4c81;">
          Booking Details
        </div>

        <strong>Guest Name:</strong> ${b.guest}<br/>
        <strong>Contact:</strong> ${b.contact || "—"}<br/>
        <strong>Email:</strong> ${b.email || "—"}<br/>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong> ${new Date(b.from).toDateString()} ${b.checkInTime || ""}<br/>
        <strong>Check-out:</strong> ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
      </div>

      ${
        b.freeRemarks || b.remarks
          ? `
          <!-- SPECIAL REMARKS -->
          <div style="
            background:#fefce8;
            border-radius:12px;
            padding:16px 18px;
            margin:16px 0;
            text-align:left;
            font-size:14.5px;
          ">
            <strong style="color:#92400e;">Special Remarks:</strong><br/>
            ${b.freeRemarks || b.remarks}
          </div>
        `
          : ""
      }

      <p>
        Kindly ensure the room is prepared and assist the guest upon arrival. 
        <strong>No payment collection is required</strong> for this booking.
      </p>

      <p>
        This notification has also been shared with the warden and administration.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>Guest Room Administration</strong>
      </p>
    `,
  });
}
