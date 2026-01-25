// caretakerBookingExtended.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear Caretaker,</p>

      <p>
        The stay for the following guest has been
        <strong>extended</strong>. Please note the updated details below.
      </p>

      <div class="details-box">
        <div class="details-title">Updated Booking Details</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact Number:</strong> ${b.contact || "—"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Previous Check-out:</strong>
          ${b.previousTo ? new Date(b.previousTo).toDateString() : "—"}
        </p>
        <p>
          <strong>New Check-out:</strong>
          ${b.to ? new Date(b.to).toDateString() : "—"}
        </p>
      </div>

      ${
        b.extendRemarks
          ? `
            <p>
              <strong>Extension Remarks:</strong>
              ${b.extendRemarks}
            </p>
          `
          : ""
      }

      <p>
        Please ensure that accommodation arrangements are continued
        accordingly and assist the guest if required.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
