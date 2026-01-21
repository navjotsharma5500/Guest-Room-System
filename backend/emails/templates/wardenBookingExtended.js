// wardenBookingExtended.js
export default function wardenBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear <strong>Warden</strong>,</p>

      <p>
        The booking for <strong>${b.guest}</strong> has been 
        <strong>extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Previous Checkout:</strong> ${b.extendRemarks || "Not available"}</p>
        <p><strong>New Checkout:</strong> ${b.to}</p>
      </div>

      <p>
        This update is shared for your record.
      </p>
    `
  });
}