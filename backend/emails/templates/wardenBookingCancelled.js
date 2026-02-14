import masterTemplate from "./masterTemplate.js";

export default function wardenBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear Warden,</p>

      <p>
        This is to inform you that the guest room booking for
        <strong>${b.guest}</strong> has been <strong>cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Cancellation Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Scheduled Stay:</strong>
          ${new Date(b.from).toDateString()} – ${new Date(b.to).toDateString()}
        </p>
        ${
          b.cancelRemarks
            ? `<p><strong>Cancellation Remarks:</strong> ${b.cancelRemarks}</p>`
            : ""
        }
      </div>

      <p>
        The hostel caretaker and administration have been notified.
        This update is shared for administrative reference and
        official records.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
