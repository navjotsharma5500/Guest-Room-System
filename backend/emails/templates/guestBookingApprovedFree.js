import masterTemplate from "./masterTemplate.js";

export default function guestBookingApprovedFree({
  guestName,
  hostelName,
  roomNo,
  checkIn,
  checkOut
}) {
  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p>Dear <strong>${guestName}</strong>,</p>

      <p>
        We are pleased to inform you that your guest room booking request has been 
        <strong style="color:#b30000;">approved</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
      </div>

      <p>
        You are requested to kindly meet the hostel caretaker upon arrival 
        for further information and assistance.
      </p>

      <p>Thank you.</p>
    `
  });
}
