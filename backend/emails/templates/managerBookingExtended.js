import masterTemplate from "./masterTemplate.js";

export default function managerBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear <strong>Manager</strong>,</p>

      <p>
        The booking for <strong>${b.guest}</strong> has been 
        <strong style="color:#b30000;">extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Details</div>

        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>

        <p><strong>Old Checkout:</strong> 
          ${b.extendRemarks || "Not available"}
        </p>

        <p><strong>New Checkout:</strong> ${b.to}</p>
      </div>

      <p>
        This notification is for your record.
      </p>
    `
  });
}
