// caretakerBookingCancelled.js
export default function caretakerBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>Caretaker</strong>,</p>

      <p>
        The booking for <strong>${b.guest}</strong> has been 
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
        This cancellation notice has been shared with the warden, manager, and admin.
      </p>

      <p>Thank you.</p>
    `
  });
}