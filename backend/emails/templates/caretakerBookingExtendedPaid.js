// caretakerBookingExtendedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingExtendedPaid(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended (Paid)",
    content: `
      <p>Dear Caretaker,</p>

      <p>
        The stay for the following guest has been
        <strong>extended with additional payment</strong>. Please note the updated details below.
      </p>

      <div class="details-box">
        <div class="details-title">Updated Booking Details</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact Number:</strong> ${b.contact || "–"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Previous Check-out:</strong>
          ${b.previousTo ? new Date(b.previousTo).toDateString() : "–"}
        </p>
        <p>
          <strong>New Check-out:</strong>
          ${b.to ? new Date(b.to).toDateString() : "–"}
        </p>
      </div>

      <div class="details-box">
        <div class="details-title">Payment Information</div>
        <p><strong>Extension Amount:</strong> ₹${b.extensionAmount || 0}</p>
        <p><strong>Total Amount:</strong> ₹${b.totalAmount || 0}</p>
        <p><strong>Amount Paid:</strong> ₹${b.paidAmount || 0}</p>
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
            <div class="details-title">Action Required</div>
            <p>
              Please verify payment receipt from the guest upon submission.
              The guest has been instructed to complete the payment and share
              proof with you.
            </p>
          </div>
        `
          : ""
      }

      ${
        b.extendRemarks
          ? `
            <p>
              <strong>Extension Remarks:</strong>
              ${b.extendRemarks}
            </p>
          `
          : ""
      }

      <p>
        Please ensure that accommodation arrangements are continued
        accordingly and assist the guest if required.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}