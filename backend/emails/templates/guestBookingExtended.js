import masterTemplate from "./masterTemplate.js";

export default function guestBookingExtended({
  guestName,
  roomNo,
  hostelName,
  oldCheckout,
  newCheckout
}) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear <strong>${guestName}</strong>,</p>

      <p>Your guest room booking has been successfully 
      <strong style="color:#b30000;">extended</strong>.</p>

      <div class="details-box">
        <div class="details-title">Updated Booking Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Previous Checkout:</strong> ${oldCheckout}</p>
        <p><strong>New Checkout:</strong> ${newCheckout}</p>
      </div>

      <p>Thank you.</p>
    `
  });
}
