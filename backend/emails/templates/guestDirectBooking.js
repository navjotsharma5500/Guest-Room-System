// backend/emails/templates/guestDirectBooking.js
import masterTemplate from "./masterTemplate.js";

export default function guestDirectBooking(b) {
  return masterTemplate({
    title: "Guest Room Booking Confirmation",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        Your guest room booking has been <strong>successfully confirmed</strong>.
        Please find your booking details below.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
        ${
          b.paymentType === "Paid" && (b.totalAmount > 0 || b.amountToBePaid > 0)
            ? `<p><strong>Amount Payable:</strong> ₹${b.totalAmount || b.amountToBePaid}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      ${
        b.paymentType === "Paid" && (b.totalAmount > 0 || b.amountToBePaid > 0)
          ? `
          <div class="details-box">
            <div class="details-title">Payment Instructions</div>
            <p>
              Please complete the payment using the following bank details:
            </p>
            <p><strong>Bank Name:</strong> State Bank of India</p>
            <p><strong>Account Number:</strong> 65181840370</p>
            <p><strong>IFSC Code:</strong> SBIN0050244</p>
            <p>
              After payment, please share the payment slip by replying to this email
              or submit it to the hostel caretaker when reporting.
            </p>
          </div>
        `
          : ""
      }

      <p>
        <strong>Important Instructions:</strong>
      </p>
      <ul>
        <li>Please report to the hostel at the specified check-in time</li>
        <li>Carry a valid government-issued ID proof</li>
        <li>Meet the hostel caretaker for room allocation</li>
        ${
          b.paymentType === "Paid"
            ? `<li>Bring the payment receipt for verification</li>`
            : ""
        }
      </ul>

      <p>
        We look forward to hosting you. For any assistance, please contact
        the hostel office.
      </p>

      <p>We wish you a comfortable stay.</p>
    `,
  });
}