// guestBookingApprovedFree.js
export default function guestBookingApprovedFree(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p>Dear <strong>${b.guest}</strong>,</p>

      <p>
        We are pleased to inform you that your guest room booking request has been 
        <strong>approved</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
      </div>

      <p>
        You are requested to kindly meet the hostel caretaker upon arrival 
        for further information and assistance.
      </p>

      <p>Thank you.</p>
    `
  });
}