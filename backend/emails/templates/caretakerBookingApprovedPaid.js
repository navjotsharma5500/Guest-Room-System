import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedPaid({
  caretakerName,
  guestName,
  roomNo,
  hostelName,
  checkIn,
  checkOut,
  amount
}) {
  return masterTemplate({
    title: `Guest Room Booking Approved – ${guestName}`,
    content: `
      <p>Dear <strong>${caretakerName}</strong>,</p>

      <p>
        A paid guest room booking has been 
        <strong style="color:#b30000;">approved</strong> for <strong>${guestName}</strong>.
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
        The guest has been provided payment details and instructed to share their payment slip.
      </p>

      <p>Please prepare the room accordingly.</p>
    `
  });
}
