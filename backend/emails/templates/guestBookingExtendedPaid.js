// guestBookingExtendedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingExtendedPaid(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended (Paid)",
    content: `
      <p>Dear ${b.guest},</p>

      <p>
        This is to inform you that your guest room booking at
        <strong>Thapar Institute of Engineering and Technology</strong>
        has been <strong>successfully extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Updated Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Revised Check-out Date:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
      </div>

      <div class="details-box">
        <div class="details-title">Payment Details</div>
        <p><strong>Extension Amount:</strong> ₹${b.extensionAmount || 0}</p>
        <p><strong>Total Amount:</strong> ₹${b.totalAmount || 0}</p>
        ${
          b.balanceAmount > 0
            ? `<p><strong>Balance Due:</strong> ₹${b.balanceAmount}</p>`
            : ""
        }
      </div>

      ${
        b.balanceAmount > 0
          ? `
          <div class="details-box">
            <div class="details-title">Payment Instructions</div>
            <p>Please complete the payment using the following bank details:</p>
            <p><strong>Bank Name:</strong> State Bank of India</p>
            <p><strong>Account Number:</strong> 65181840370</p>
            <p><strong>IFSC Code:</strong> SBIN0050244</p>
            <p>
              Kindly retain the payment receipt and share it with the hostel
              caretaker or via email.
            </p>
          </div>
        `
          : ""
      }

      ${
        b.extendRemarks
          ? `<p><strong>Remarks:</strong> ${b.extendRemarks}</p>`
          : ""
      }

      <p>
        Kindly ensure that the room is vacated on or before the revised
        check-out time. If you require any assistance, please contact
        the hostel caretaker.
      </p>

      <p>
        We wish you a comfortable and pleasant stay.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}