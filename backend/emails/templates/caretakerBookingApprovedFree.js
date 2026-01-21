// caretakerBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedFree(b) {
  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear <strong>Caretaker</strong>,</p>

      <p>
        This is to inform you that a guest room booking has been 
        <strong>approved</strong> for <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
      </div>

      <p>
        Kindly ensure that the room is prepared and provide assistance to the guest upon arrival.
      </p>

      <p>Thank you.</p>
    `
  });
}