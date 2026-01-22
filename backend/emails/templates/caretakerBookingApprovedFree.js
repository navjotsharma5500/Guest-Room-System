// caretakerBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedFree(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved (Free)",
    content: `
      <p>Dear Caretaker,</p>

      <p>
        This is to inform you that a <strong>free guest room booking</strong> has been
        approved. Kindly make the necessary arrangements as per the details below.
      </p>

      <div class="details">
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact Number:</strong> ${b.contact || "-"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} at ${b.checkInTime || "—"}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} at ${b.checkOutTime || "—"}
        </p>
        <p><strong>Purpose of Stay:</strong> ${b.purpose || "-"}</p>
        <p><strong>Booking Type:</strong> Free</p>
      </div>

      <p>
        Please ensure that the room is prepared before the guest’s arrival and verify
        the guest’s identification at the time of check-in.
      </p>

      <p>
        For any clarification, you may coordinate with the hostel office.
      </p>
    `,
  });
}
