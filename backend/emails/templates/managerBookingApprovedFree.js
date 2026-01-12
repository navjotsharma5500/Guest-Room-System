import masterTemplate from "./masterTemplate.js";

export default function managerBookingApprovedFree(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved – ${b.guest}`,
    content: `
      <p>Dear <strong>Manager</strong>,</p>

      <p>
        A guest room booking has been 
        <strong style="color:#b30000;">approved</strong>
        for <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
        <p><strong>Type:</strong> Free Booking</p>
      </div>

      <p>
        This approval is shared with you for your record.
      </p>
    `
  });
}
