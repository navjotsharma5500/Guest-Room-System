// guestBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function guestBookingApprovedPaid(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        We are pleased to inform you that your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been successfully approved.
      </p>

      <div class="details-box">
        <div class="details-title">Stay Details</div>

        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>

        <p>
          <strong>Check-in:</strong>
          ${formatDateIST(b.from)} ${b.checkInTime || ""}
        </p>

        <p>
          <strong>Check-out:</strong>
          ${formatDateIST(b.to)} ${b.checkOutTime || ""}
        </p>
      </div>

      <div class="details-box">
        <div class="details-title">Payment Information</div>

        <p><strong>Amount Payable:</strong> ₹${b.amount}</p>

        <p>
          <strong>Bank:</strong> State Bank of India<br/>
          <strong>Account Number:</strong> 65181840370<br/>
          <strong>IFSC Code:</strong> SBIN0050244
        </p>
      </div>

      <p>
        Kindly complete the payment and carry a copy of the receipt and Address Proof
        at the time of reporting. The hostel caretaker may request it for verification.
      </p>

      <p>
        Please report to the hostel at the specified check-in time and coordinate
        with the caretaker for room allocation and assistance.
      </p>

      <div class="details-box">
        <div class="details-title">Important Information</div>
        <ul>
          <li>Kindly confirm your booking only if you are certain about your stay. The payment once made is non-refundable. We advise you to make the payment on the day of arrival at the hostel to avoid any inconvenience.</li>
        </ul>
      </div>

      <p>
        We look forward to welcoming you and wish you a comfortable stay.
      </p>

      <p>
        Warm regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
