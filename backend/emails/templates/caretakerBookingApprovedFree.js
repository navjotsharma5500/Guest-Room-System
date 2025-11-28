import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedFree({
  caretakerName,
  guestName,
  roomNo,
  hostelName,
  checkIn,
  checkOut
}) {
  return masterTemplate({
    title: `Guest Room Booking Approved – ${guestName}`,
    content: `
      <p>Dear <strong>${caretakerName}</strong>,</p>

      <p>
        This is to inform you that a guest room booking has been 
        <strong style="color:#b30000;">approved</strong> for <strong>${guestName}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
      </div>

      <p>
        Kindly ensure that the room is prepared and provide assistance to the guest upon arrival.
      </p>

      <p>Thank you.</p>
    `
  });
}
