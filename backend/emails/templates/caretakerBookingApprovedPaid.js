// caretakerBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function caretakerBookingApprovedPaid(b) {
  const total = b.totalAmount || b.amount || 0;
  const paid = b.paidAmount || 0;
  const balance = b.balanceAmount ?? total - paid;

  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p style="margin-top:0;">Dear Caretaker,</p>

      <p>
        A guest room booking has been <strong>approved</strong>. Please review 
        the booking and payment summary below for verification and necessary action.
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
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong> ${formatDateIST(b.from)} ${b.checkInTime || ""}<br/>
        <strong>Check-out:</strong> ${formatDateIST(b.to)} ${b.checkOutTime || ""}
      </div>

      <!-- PAYMENT SUMMARY -->
      <div style="
        background:#eef6ff;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        text-align:left;
        font-size:14.5px;
      ">

        <div style="font-weight:600;margin-bottom:10px;color:#0f4c81;">
          Payment Summary
        </div>

        <strong>Total Amount:</strong> ₹${total}<br/>
        <strong>Amount Paid:</strong> ₹${paid}<br/>
        <strong>Balance Amount:</strong> ₹${balance}
      </div>

      <p style="font-weight:600;margin-bottom:6px;">
        Instructions:
      </p>

      <ul style="padding-left:18px;margin-top:6px;">
        <li>Verify the guest’s payment receipt at the time of reporting</li>
        <li>If any balance remains, guide the guest as per hostel procedure</li>
        <li>Confirm valid identification before room handover</li>
      </ul>

      <p>
        For any discrepancy, kindly coordinate with the Hostel Manager.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>Guest Room Administration</strong>
      </p>
    `,
  });
}
