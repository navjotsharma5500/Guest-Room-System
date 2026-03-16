// guestBookingExtendedPaid.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function guestBookingExtendedPaid(b) {
  const balance = Number(b.balanceAmount || 0);

  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        We are pleased to inform you that your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been <strong>successfully extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Updated Stay Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Revised Check-out:</strong>
          ${formatDateIST(b.to)} ${b.checkOutTime || ""}
        </p>
      </div>

      <div class="details-box">
        <div class="details-title">Payment Summary</div>
        <p><strong>Extension Amount:</strong> ₹${b.extensionAmount || 0}</p>
        <p><strong>Total Booking Amount:</strong> ₹${b.totalAmount || 0}</p>
        <p><strong>Amount Paid:</strong> ₹${b.paidAmount || 0}</p>
        ${
          balance > 0
            ? `<p><strong>Balance Due:</strong> ₹${balance}</p>`
            : `<p><strong>Status:</strong> Fully Paid</p>`
        }
      </div>

      ${
        balance > 0
          ? `
          <div class="details-box">
            <div class="details-title">Action Required</div>
            <p>
              Kindly complete the pending payment using the following bank details
              and share the receipt with the hostel caretaker or via email.
            </p>
            <p><strong>Bank Name:</strong> State Bank of India</p>
            <p><strong>Account Number:</strong> 65181840370</p>
            <p><strong>IFSC Code:</strong> SBIN0050244</p>
          </div>
        `
          : ""
      }

      ${
        b.extendRemarks
          ? `
          <div class="details-box">
            <div class="details-title">Remarks</div>
            <p>${b.extendRemarks}</p>
          </div>
        `
          : ""
      }

      <div class="details-box">
        <div class="details-title">Important Information</div>
        <ul>
          <li>Kindly confirm your booking only if you are certain about your stay. The payment once made is non-refundable. We advise you to make the payment on the day of arrival at the hostel to avoid any inconvenience.</li>
        </ul>
      </div>

      <p>
        Please ensure the room is vacated on or before the revised check-out date.
        For any assistance, feel free to contact the hostel caretaker.
      </p>

      <p>
        We appreciate your cooperation and wish you a continued pleasant stay.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
