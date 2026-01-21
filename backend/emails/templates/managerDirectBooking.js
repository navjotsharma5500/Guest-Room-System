// managerDirectBooking.js
export default function managerDirectBooking(b) {
  return masterTemplate({
    title: `Direct Guest Room Booking — ${b.guest}`,
    content: `
      <p>Dear <strong>Manager</strong>,</p>

      <p>
        The hostel caretaker has made a 
        <strong>direct guest room booking</strong> for 
        <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
        ${
          b.amount
            ? `<p><strong>Amount:</strong> ₹${b.amount}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      <p>
        This notification is for your information.
      </p>
    `
  });
}