// wardenBookingExtendedPaid.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function wardenBookingExtendedPaid(b) {
  const extensionAmount = Number(b.extensionAmount || 0);
  const totalAmount = Number(b.totalAmount || 0);
  const balance = Number(b.balanceAmount || 0);

  return masterTemplate({
    title: "Guest Room Booking Extended (Paid)",
    content: `
      <p>Dear Warden,</p>

      <p>
        Please note that the guest room booking for
        <strong>${b.guest}</strong> has been
        <strong>extended with additional payment</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Previous Checkout:</strong>
          ${b.previousTo ? formatDateIST(b.previousTo) : "As per earlier booking"}
        </p>
        <p>
          <strong>New Checkout:</strong>
          ${formatDateIST(b.to)}
        </p>
      </div>

      <div class="details-box">
        <div class="details-title">Payment Information</div>
        <p><strong>Extension Amount:</strong> ₹${extensionAmount.toFixed(2)}</p>
        <p><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
        ${
          balance > 0
            ? `<p><strong>Balance Due:</strong> ₹${balance.toFixed(2)}</p>`
            : `<p><strong>Payment Status:</strong> Fully Paid</p>`
        }
      </div>

      ${
        b.extendRemarks
          ? `<p><strong>Remarks:</strong> ${b.extendRemarks}</p>`
          : ""
      }

      <p>
        Kindly take note of the revised checkout date and updated billing details.
        The caretaker and management have been informed.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
