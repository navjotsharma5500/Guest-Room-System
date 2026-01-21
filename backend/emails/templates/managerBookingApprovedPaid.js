// managerBookingApprovedPaid.js
export default function managerBookingApprovedPaid(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear <strong>Manager</strong>,</p>

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
        The guest has been instructed to make payment and share the payment slip.
      </p>

      <p>
        This approval notice is shared with you for your record.
      </p>
    `
  });
}