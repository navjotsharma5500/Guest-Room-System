import masterTemplate from "./masterTemplate.js";

export default function managerBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>Manager</strong>,</p>

      <p>
        The booking for <strong>${b.guest}</strong> at 
        <strong>${b.hostel}</strong> (Room: ${b.roomNo}) has been 
        <strong style="color:#b30000;">cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Details</div>
        <p><strong>Reason:</strong> ${b.cancelRemarks || "Not specified"}</p>
      </div>

      <p>
        This message is for your record.
      </p>
    `
  });
}
