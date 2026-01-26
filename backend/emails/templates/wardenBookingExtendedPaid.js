// wardenBookingExtendedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function wardenBookingExtendedPaid(b) {
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
          ${b.previousTo ? new Date(b.previousTo).toDateString() : "As per earlier booking"}
        </p>
        <p>
          <strong>New Checkout:</strong>
          ${new Date(b.to).toDateString()}
        </p>
      </div>

      <div class="details-box">
        <div class="details-title">Payment Information</div>
        <p><strong>Extension Amount:</strong> ₹${b.extensionAmount || 0}</p>
        <p><strong>Total Amount:</strong> ₹${b.totalAmount || 0}</p>
        ${
          balance > 0
            ? `<p><strong>Balance Due:</strong> ₹${balance}</p>`
            : `<p><strong>Payment Status:</strong> Fully Paid</p>`
        }
      </div>

      ${
        b.extendRemarks
          ? `<p><strong>Remarks:</strong> ${b.extendRemarks}</p>`
          : ""
      }

      <p>
        Kindly take note of the revised checkout date and payment details.
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
