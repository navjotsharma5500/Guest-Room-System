import masterTemplate from "./masterTemplate.js";

export default function enquiryApproved(e) {
  return masterTemplate({
    title: "Guest Room Enquiry Approved",
    content: `
      <p>Dear <strong>${e.name}</strong>,</p>

      <p>
        We are pleased to inform you that your guest room enquiry has been
        <strong>approved</strong>.
      </p>

      <div class="details">
        <p><strong>Check-in:</strong> ${new Date(e.from).toDateString()} ${e.checkInTime}</p>
        <p><strong>Check-out:</strong> ${new Date(e.to).toDateString()} ${e.checkOutTime}</p>
      </div>

      <p>
        Our team will contact you shortly with further instructions.
      </p>
    `,
  });
}
