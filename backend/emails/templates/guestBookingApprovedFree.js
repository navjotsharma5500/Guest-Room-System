// guestBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function guestBookingApprovedFree(b) {
  return masterTemplate({
    title: "Your Guest Room Booking is Confirmed",
    content: `
      <p style="margin-top:0;">Dear ${b.guest},</p>

      <p>
        We are delighted to inform you that your guest room booking has been 
        <strong>successfully approved</strong>. We look forward to welcoming you.
      </p>

      <div style="
        background:#f8fafc;
        border-radius:12px;
        padding:20px 22px;
        margin:20px 0;
        text-align:left;
        font-size:14.5px;
      ">

        <div style="font-weight:600;margin-bottom:12px;color:#0f4c81;">
          Your Stay Details
        </div>

        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong> ${formatDateIST(b.from)} ${b.checkInTime || ""}<br/>
        <strong>Check-out:</strong> ${formatDateIST(b.to)} ${b.checkOutTime || ""}
      </div>

      <p>
        Kindly report to the hostel at the specified check-in time and connect 
        with the caretaker for smooth room handover and assistance.
      </p>

      <p>
        Please carry a valid identification or any approval documents, if applicable.
      </p>

      <p>
        We wish you a comfortable and pleasant stay with us.
      </p>

      <p style="margin-bottom:0;">
        Warm regards,<br/>
        <strong>Guest Room Administration</strong>
      </p>
    `,
  });
}
