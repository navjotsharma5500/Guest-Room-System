import masterTemplate from "./masterTemplate.js";

export default function managerBookingApprovedPaid({
  managerName,
  guestName,
  hostelName,
  roomNo,
  checkIn,
  checkOut,
  amount
}) {
  return masterTemplate({
    title: `Guest Room Booking Approved – ${guestName}`,
    content: `
      <p>Dear <strong>${managerName}</strong>,</p>

      <p>
        A <strong>paid</strong> guest room booking has been 
        <strong style="color:#b30000;">approved</strong> for 
        <strong>${guestName}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
      </div>

      <p>
        Guest has been instructed to make payment and share the payment slip.
      </p>

      <p>
        This approval notice is shared with you for your record.
      </p>
    `
  });
}
