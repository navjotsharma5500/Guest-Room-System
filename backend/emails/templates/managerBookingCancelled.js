import masterTemplate from "./masterTemplate.js";

export default function managerBookingCancelled({
  managerName,
  guestName,
  hostelName,
  roomNo,
  reason = "Not specified"
}) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>${managerName}</strong>,</p>

      <p>
        The booking for <strong>${guestName}</strong> at 
        <strong>${hostelName}</strong> (Room: ${roomNo}) has been 
        <strong style="color:#b30000;">cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Details</div>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>

      <p>
        This message is for your record.
      </p>
    `
  });
}
