import masterTemplate from "./masterTemplate.js";

export default function wardenBookingCancelled({
  wardenName,
  guestName,
  hostelName,
  roomNo,
  reason = "Not specified"
}) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>${wardenName}</strong>,</p>

      <p>
        Please be informed that the guest room booking for 
        <strong>${guestName}</strong> has been 
        <strong style="color:#b30000;">cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Cancellation Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>

      <p>
        This email is for your information.
      </p>
    `
  });
}
