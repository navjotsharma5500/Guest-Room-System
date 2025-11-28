import masterTemplate from "./masterTemplate.js";

export default function wardenBookingExtended({
  wardenName,
  guestName,
  hostelName,
  roomNo,
  oldCheckout,
  newCheckout
}) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear <strong>${wardenName}</strong>,</p>

      <p>
        The booking for <strong>${guestName}</strong> has been 
        <strong style="color:#b30000;">extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Previous Checkout:</strong> ${oldCheckout}</p>
        <p><strong>New Checkout:</strong> ${newCheckout}</p>
      </div>

      <p>
        This update is shared for your record.
      </p>
    `
  });
}
