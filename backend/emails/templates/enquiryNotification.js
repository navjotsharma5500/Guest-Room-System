// enquiryNotification.js
export default function enquiryNotification(e) {
  return masterTemplate({
    title: `New Guest Room Enquiry — ${e.name}`,
    content: `
      <p>Dear <strong>Admin/Manager</strong>,</p>

      <p>
        A new guest room enquiry has been submitted by 
        <strong>${e.name}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Enquiry Details</div>
        <p><strong>Name:</strong> ${e.name}</p>
        <p><strong>Email:</strong> ${e.email}</p>
        <p><strong>Phone:</strong> ${e.contact}</p>
        <p><strong>Purpose:</strong> ${e.purpose}</p>
        <p><strong>Check-in:</strong> ${e.from}</p>
        <p><strong>Check-out:</strong> ${e.to}</p>
        <p><strong>Message:</strong> ${e.reference || "No additional message"}</p>
      </div>

      <p>
        Kindly review the enquiry and take necessary action.
      </p>
    `
  });
}
