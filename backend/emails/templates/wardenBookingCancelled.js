// wardenBookingCancelled.js
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
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Original Stay:</strong>
          ${new Date(b.from).toDateString()} – ${new Date(b.to).toDateString()}
        </p>
        <p><strong>Reason:</strong> ${b.cancelRemarks || "Not specified"}</p>
      </div>

      <p>
        Kindly note this update for your records. The caretaker and management
        have been informed accordingly.
      </p>
    `,
  });
}
