import masterTemplate from "./masterTemplate.js";

export default function guestEnquiryReceived(e) {
  return masterTemplate({
    title: "New Guest Room Enquiry Received",
    content: `
      <p><strong>New Enquiry Submitted</strong></p>

      <div class="details-box">
        <div class="details-title">Guest Details</div>

        <p><strong>Name:</strong> ${e.name}</p>
        <p><strong>Email:</strong> ${e.email}</p>
        <p><strong>Purpose:</strong> ${e.purpose}</p>
        <p><strong>Requested Check-in:</strong> ${e.from}</p>
        <p><strong>Requested Check-out:</strong> ${e.to}</p>
      </div>

      <p>Please review the enquiry and take further action.</p>
    `
  });
}
