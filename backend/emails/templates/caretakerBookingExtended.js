import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingExtended({
  caretakerName,
  guestName,
  hostelName,
  roomNo,
  oldCheckout,
  newCheckout
}) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear <strong>${caretakerName}</strong>,</p>

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
        This extension update has been shared with the warden, manager, and admin.
      </p>

      <p>Thank you.</p>
    `
  });
}
