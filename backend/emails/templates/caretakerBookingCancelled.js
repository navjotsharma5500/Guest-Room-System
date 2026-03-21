// caretakerBookingCancelled.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function caretakerBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p style="margin-top:0;">Dear Caretaker,</p>

      <p>
        Please be informed that the following guest room booking has been 
        <strong>cancelled</strong>.
      </p>

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
        <strong>Contact Number:</strong> ${b.contact || "—"}<br/>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong> ${b.from ? formatDateIST(b.from) : "—"}<br/>
        <strong>Check-out:</strong> ${b.to ? formatDateIST(b.to) : "—"}
      </div>

      ${
        b.cancelRemarks
          ? `
            <div style="
              background:#fff4f4;
              border-radius:12px;
              padding:16px 18px;
              margin:16px 0;
              text-align:left;
              font-size:14.5px;
            ">
              <strong style="color:#b91c1c;">Cancellation Remarks:</strong><br/>
              ${b.cancelRemarks}
            </div>
          `
          : ""
      }

      <p>
        Kindly ensure that the room is released in the system and prepared 
        for future bookings.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>Guest Room Administration</strong>
      </p>
    `,
  });
}
