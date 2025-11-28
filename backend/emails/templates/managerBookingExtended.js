import masterTemplate from "./masterTemplate.js";

export default function managerBookingExtended({
  managerName,
  guestName,
  hostelName,
  roomNo,
  oldCheckout,
  newCheckout
}) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear <strong>${managerName}</strong>,</p>

      <p>
        The booking for <strong>${guestName}</strong> has been 
        <strong style="color:#b30000;">extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Old Checkout:</strong> ${oldCheckout}</p>
        <p><strong>New Checkout:</strong> ${newCheckout}</p>
      </div>

      <p>
        This notification is for your record.
      </p>
    `
  });
}
