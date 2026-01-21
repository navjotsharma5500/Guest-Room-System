// guestBookingCancelled.js
export default function guestBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>${b.guest}</strong>,</p>

      <p>
        We regret to inform you that your guest room booking has been 
        <strong>cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
      </div>

      <p>
        If needed, you may submit a new request with alternative dates.
      </p>

      <p>We apologize for the inconvenience.</p>
    `
  });
}