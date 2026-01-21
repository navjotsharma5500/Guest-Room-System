// guestBookingRejected.js
export default function guestBookingRejected(b) {
  return masterTemplate({
    title: "Guest Room Booking Request — Rejected",
    content: `
      <p>Dear <strong>${b.guest}</strong>,</p>

      <p>
        We regret to inform you that your guest room booking request 
        <strong>cannot be approved</strong> due to unavailability of rooms.
      </p>

      <div class="details-box">
        <div class="details-title">Requested Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
      </div>

      <p>
        You may submit a new request with alternative dates, and we will be happy to assist you.
      </p>

      <p>Thank you for your understanding.</p>
    `
  });
}