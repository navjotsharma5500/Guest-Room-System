// managerBookingCancelled.js
export default function managerBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>Manager</strong>,</p>

      <p>
        The booking for <strong>${b.guest}</strong> at 
        <strong>${b.hostel}</strong> (Room: ${b.roomNo}) has been 
        <strong>cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Cancellation Details</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Reason:</strong> ${b.cancelRemarks || "Not specified"}</p>
      </div>

      <p>
        This message is for your record.
      </p>
    `
  });
}