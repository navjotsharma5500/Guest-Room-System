// caretakerBookingCancelled.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear Caretaker,</p>

      <p>
        Please note that the following guest room booking has been
        <strong>cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact Number:</strong> ${b.contact || "—"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${b.from ? new Date(b.from).toDateString() : "—"}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${b.to ? new Date(b.to).toDateString() : "—"}
        </p>
      </div>

      ${
        b.cancelRemarks
          ? `
            <p>
              <strong>Cancellation Remarks:</strong>
              ${b.cancelRemarks}
            </p>
          `
          : ""
      }

      <p>
        Please ensure that the room is released and made available
        for future bookings.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
