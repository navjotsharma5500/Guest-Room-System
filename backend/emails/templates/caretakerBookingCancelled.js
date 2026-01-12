import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>Caretaker</strong>,</p>

      <p>
        The booking for <strong>${b.guest}</strong> has been 
        <strong style="color:#b30000;">cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Cancellation Reason</div>
        <p>${b.cancelRemarks || "Not specified"}</p>
      </div>

      <p>
        This cancellation notice has been shared with the warden, manager, and admin.
      </p>

      <p>Thank you.</p>
    `
  });
}
