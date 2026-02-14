// backend/emails/templates/guestDirectBooking.js
import masterTemplate from "./masterTemplate.js";

export default function guestDirectBooking(b) {
  return masterTemplate({
    title: "Guest Room Booking Confirmed",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        We are pleased to confirm your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>.
        Your accommodation has been successfully arranged.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>

        ${
          b.totalAmount > 0
            ? `<p><strong>Amount Payable:</strong> ₹${b.totalAmount}</p>`
            : ""
        }
      </div>

      ${
        b.totalAmount > 0
          ? `
          <div class="details-box">
            <div class="details-title">Payment Instructions</div>
            <p>Please complete the payment using the details below:</p>
            <p><strong>Bank:</strong> State Bank of India</p>
            <p><strong>Account Number:</strong> 65181840370</p>
            <p><strong>IFSC Code:</strong> SBIN0050244</p>
            <p>
              Kindly retain the payment receipt and present it to the hostel
              caretaker at the time of check-in.
            </p>
          </div>
        `
          : ""
      }

      <div class="details-box">
        <div class="details-title">Important Information</div>
        <ul>
          <li>Please arrive at the hostel at the scheduled check-in time</li>
          <li>Carry a valid government-issued photo ID</li>
          <li>Contact the hostel caretaker upon arrival for assistance</li>
          ${
            b.totalAmount > 0
              ? `<li>Present proof of payment for verification</li>`
              : ""
          }
        </ul>
      </div>

      <p>
        We look forward to welcoming you and hope you have a comfortable stay.
      </p>

      <p>
        Warm regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
