import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedPaid(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved – ${b.guest}`,
    content: `
      <p>Dear <strong>Caretaker</strong>,</p>

      <p>
        A paid guest room booking has been 
        <strong style="color:#b30000;">approved</strong> for <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
        <p><strong>Amount:</strong> ₹${b.amount}</p>
      </div>

      <p>
        The guest has been provided payment details and instructed to share their payment slip.
      </p>

      <p>Please prepare the room accordingly.</p>
    `
  });
}
