import masterTemplate from "./masterTemplate.js";

export default function guestEnquiryReceived({
  guestName,
  guestEmail,
  purpose,
  checkIn,
  checkOut
}) {
  return masterTemplate({
    title: "New Guest Room Enquiry Received",
    content: `
      <p><strong>New Enquiry Submitted</strong></p>

      <div class="details-box">
        <div class="details-title">Guest Details</div>
        <p><strong>Name:</strong> ${guestName}</p>
        <p><strong>Email:</strong> ${guestEmail}</p>
        <p><strong>Purpose:</strong> ${purpose}</p>
        <p><strong>Requested Check-in:</strong> ${checkIn}</p>
        <p><strong>Requested Check-out:</strong> ${checkOut}</p>
      </div>

      <p>Please review the enquiry and take further action.</p>
    `
  });
}
