import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingCancelled({
  caretakerName,
  guestName,
  reason = "Not specified"
}) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>${caretakerName}</strong>,</p>

      <p>
        The booking for <strong>${guestName}</strong> has been 
        <strong style="color:#b30000;">cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Cancellation Reason</div>
        <p>${reason}</p>
      </div>

      <p>
        This cancellation notice has been shared with the warden, manager, and admin.
      </p>

      <p>Thank you.</p>
    `
  });
}
