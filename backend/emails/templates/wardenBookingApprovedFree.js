import masterTemplate from "./masterTemplate.js";

export default function wardenBookingApprovedFree({
  wardenName,
  guestName,
  hostelName,
  roomNo,
  checkIn,
  checkOut
}) {
  return masterTemplate({
    title: `Guest Room Booking Approved – ${guestName}`,
    content: `
      <p>Dear <strong>${wardenName}</strong>,</p>

      <p>
        This is to inform you that a guest room booking has been 
        <strong style="color:#b30000;">approved</strong> for 
        <strong>${guestName}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
      </div>

      <p>
        The hostel caretaker has been instructed to prepare the room.
      </p>

      <p>This email is for your kind information.</p>
    `
  });
}
