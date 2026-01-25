// caretakerBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedFree(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p>Dear Caretaker,</p>

      <p>
        This is to inform you that a guest room booking has been
        <strong>approved</strong>. Please make the necessary arrangements
        as per the details provided below.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact Number:</strong> ${b.contact || "—"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
        <p><strong>Purpose of Stay:</strong> ${b.purpose || "—"}</p>
      </div>

      <p>
        Please ensure that the room is prepared prior to the guest’s arrival.
        Verify the guest’s identification at the time of check-in and
        assist with room handover.
      </p>

      <p>
        For any clarification, please coordinate with the hostel Manager.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
