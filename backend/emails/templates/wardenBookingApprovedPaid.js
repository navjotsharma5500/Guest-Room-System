// wardenBookingApprovedPaid.js
export default function wardenBookingApprovedPaid(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear <strong>Warden</strong>,</p>

      <p>
        A <strong>paid</strong> guest room booking has been 
        <strong>approved</strong> for 
        <strong>${b.guest}</strong>.
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
        Guest has been provided payment instructions and asked to submit the payment slip.
      </p>

      <p>This email is for your information.</p>
    `
  });
}