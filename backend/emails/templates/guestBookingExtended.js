import masterTemplate from "./masterTemplate.js";

export default function guestBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear <strong>${b.guest}</strong>,</p>

      <p>Your guest room booking has been successfully 
      <strong style="color:#b30000;">extended</strong>.</p>

      <div class="details-box">
        <div class="details-title">Updated Booking Details</div>

        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>

        <p><strong>Previous Checkout:</strong> 
          ${b.extendRemarks || "Not available"}
        </p>

        <p><strong>New Checkout:</strong> ${b.to}</p>
      </div>

      <p>Thank you.</p>
    `
  });
}
