import masterTemplate from "./masterTemplate.js";

export default function wardenBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>Warden</strong>,</p>

      <p>
        Please be informed that the guest room booking for 
        <strong>${b.guest}</strong> has been 
        <strong style="color:#b30000;">cancelled</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Cancellation Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Reason:</strong> ${b.cancelRemarks || "Not specified"}</p>
      </div>

      <p>
        This email is for your information.
      </p>
    `
  });
}
