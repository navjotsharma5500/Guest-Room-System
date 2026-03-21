// caretakerDirectBooking.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function caretakerDirectBooking(b) {
  return masterTemplate({
    title: `Direct Guest Room Booking — ${b.guest}`,
    content: `
      <p style="margin-top:0;">Dear Caretaker,</p>

      <p>
        A <strong>direct guest room booking</strong> has been created successfully. 
        Kindly review the booking details below and make the necessary arrangements.
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
        <strong>Contact Number:</strong> ${b.contact || "—"}<br/>
        <strong>Email:</strong> ${b.email || "—"}<br/>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong> ${formatDateIST(b.from)} ${b.checkInTime || ""}<br/>
        <strong>Check-out:</strong> ${formatDateIST(b.to)} ${b.checkOutTime || ""}
        ${
          b.amountToBePaid > 0
            ? `<br/><strong>Amount Payable:</strong> ₹${b.amountToBePaid}`
            : ""
        }
      </div>

      ${
        b.amountToBePaid > 0
          ? `
          <!-- PAYMENT INSTRUCTIONS -->
          <div style="
            background:#eef6ff;
            border-radius:12px;
            padding:18px 20px;
            margin:18px 0;
            text-align:left;
            font-size:14.5px;
          ">

            <div style="font-weight:600;margin-bottom:10px;color:#0f4c81;">
              Payment Instructions
            </div>

            The guest has been instructed to submit the payment receipt at the time 
            of reporting or share it via email as per procedure.<br/><br/>

            <strong>Bank Name:</strong> State Bank of India<br/>
            <strong>Account Number:</strong> 65181840370<br/>
            <strong>IFSC Code:</strong> SBIN0050244
          </div>
        `
          : ""
      }

      <p>
        Please ensure the room is prepared prior to arrival and verify the 
        guest’s identification at check-in.
      </p>

      <p>
        This information has also been shared with the concerned warden and 
        administration.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>Guest Room Administration</strong>
      </p>
    `,
  });
}
