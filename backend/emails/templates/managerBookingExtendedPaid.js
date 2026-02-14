import masterTemplate from "./masterTemplate.js";

export default function managerBookingExtendedPaid(b) {
  const balance = Number(b.balanceAmount || 0);
  const extensionAmount = b.extensionAmount || 0;
  const totalAmount = b.totalAmount || 0;
  const paidAmount = b.paidAmount || 0;

  return masterTemplate({
    title: "Guest Room Booking Extended (Payment Updated)",
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that the guest room booking for
        <strong>${b.guest}</strong> has been <strong>successfully extended</strong>,
        and the corresponding payment has been recorded.
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
        <div class="details-title">Updated Financial Details</div>
        <p><strong>Extension Charges:</strong> ₹${extensionAmount}</p>
        <p><strong>Total Booking Amount:</strong> ₹${totalAmount}</p>
        <p><strong>Amount Received:</strong> ₹${paidAmount}</p>
        ${
          balance > 0
            ? `<p><strong>Outstanding Balance:</strong> ₹${balance}</p>`
            : `<p><strong>Payment Status:</strong> Fully Settled</p>`
        }
      </div>

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
        This update is shared for administrative tracking and official records.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
