// guestBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingApprovedPaid(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        We are pleased to inform you that your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been approved.
      </p>

      <p>
        The confirmed details of your stay are provided below:
      </p>

      <p>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong>
        ${new Date(b.from).toDateString()} ${b.checkInTime || ""}<br/>
        <strong>Check-out:</strong>
        ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
      </p>

      <p>
        <strong>Amount Payable:</strong> ₹${b.amount}
      </p>

      <p>
        Payment may be made using the following bank details:
      </p>

      <p>
        <strong>Bank:</strong> State Bank of India<br/>
        <strong>Account Number:</strong> 65181840370<br/>
        <strong>IFSC Code:</strong> SBIN0050244
      </p>

      <p>
        Kindly carry a copy of the payment receipt or confirmation at the time
        of reporting. The hostel caretaker may request it for verification.
      </p>

      <p>
        Please report to the hostel at the specified check-in time and
        coordinate with the hostel caretaker for room allocation.
      </p>

      <p>
        We look forward to hosting you and wish you a pleasant stay.
      </p>

      <p>
        Warm regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
