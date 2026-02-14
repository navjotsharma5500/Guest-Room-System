// guestBookingExtended.js
import masterTemplate from "./masterTemplate.js";

export default function guestBookingExtended(b) {
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
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
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
              Kindly complete the pending payment at the earliest and share
              the receipt with the hostel caretaker for confirmation.
            </p>
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

      <p>
        Please ensure the room is vacated on or before the revised check-out date.
        For assistance, feel free to contact the hostel caretaker.
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
