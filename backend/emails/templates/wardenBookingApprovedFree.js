// wardenBookingApprovedFree.js
export default function wardenBookingApprovedFree(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear <strong>Warden</strong>,</p>

      <p>
        This is to inform you that a guest room booking has been 
        <strong>approved</strong> for 
        <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
      </div>

      <p>
        The hostel caretaker has been instructed to prepare the room.
      </p>

      <p>This email is for your kind information.</p>
    `
  });
}
