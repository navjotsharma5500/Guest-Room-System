import masterTemplate from "./masterTemplate.js";

export default function managerBookingExtended(b) {
  const balance = Number(b.balanceAmount || 0);
  const extensionAmount = b.extensionAmount || 0;
  const totalAmount = b.totalAmount || 0;

  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that the guest room booking for
        <strong>${b.guest}</strong> has been <strong>successfully extended</strong>.
        A revised bill has been generated accordingly.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Revised Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
      </div>

      <div class="details-box">
        <div class="details-title">Updated Billing Details</div>
        <p><strong>Extension Charges:</strong> ₹${extensionAmount}</p>
        <p><strong>Total Booking Amount:</strong> ₹${totalAmount}</p>
        ${
          balance > 0
            ? `<p><strong>Balance Due:</strong> ₹${balance}</p>`
            : `<p><strong>Balance Due:</strong> ₹0 (Paid)</p>`
        }
      </div>

      ${
        b.extendRemarks
          ? `
          <div class="details-box">
            <div class="details-title">Additional Remarks</div>
            <p>${b.extendRemarks}</p>
          </div>
        `
          : ""
      }

      <p>
        The guest has been informed regarding the revised payment amount
        and applicable settlement process.
      </p>

      <p>
        This notification is issued for administrative reference and records.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
