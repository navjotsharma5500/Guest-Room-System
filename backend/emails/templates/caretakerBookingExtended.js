// caretakerBookingExtended.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear Caretaker,</p>

      <p>
        The stay for <strong>${b.guest}</strong> has been
        <strong>extended</strong>. Please find the updated details below.
      </p>

      <div class="details">
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact Number:</strong> ${b.contact || "-"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Previous Check-out:</strong>
          ${b.previousTo ? new Date(b.previousTo).toDateString() : "-"}
        </p>
        <p>
          <strong>New Check-out:</strong>
          ${b.to ? new Date(b.to).toDateString() : "-"}
        </p>
        <p><strong>Extension Remarks:</strong> ${b.extendRemarks || "Not specified"}</p>
      </div>

      <p>
        Kindly ensure continued accommodation arrangements for the guest.
      </p>
    `,
  });
}
