// guestEnquiryReceived.js
export default function guestEnquiryReceived(e) {
  return masterTemplate({
    title: "Guest Room Enquiry Received",
    content: `
      <p>Dear <strong>${e.name}</strong>,</p>

      <p>
        Thank you for your interest in our guest room facilities.
      </p>

      <div class="details-box">
        <div class="details-title">Your Enquiry Details</div>
        <p><strong>Name:</strong> ${e.name}</p>
        <p><strong>Email:</strong> ${e.email}</p>
        <p><strong>Purpose:</strong> ${e.purpose}</p>
        <p><strong>Requested Check-in:</strong> ${e.from}</p>
        <p><strong>Requested Check-out:</strong> ${e.to}</p>
      </div>

      <p>
        Your enquiry has been received and is being reviewed. 
        Our team will contact you shortly.
      </p>

      <p>Thank you for your patience.</p>
    `
  });
}