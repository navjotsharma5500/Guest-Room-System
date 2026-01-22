// guestEnquiryReceived.js
import masterTemplate from "./masterTemplate.js";

export default function guestEnquiryReceived(e) {
  return masterTemplate({
    title: "Enquiry Received — Thapar Guest Room",
    content: `
      <p>Dear ${e.name},</p>

      <p>
        Thank you for submitting your enquiry to the
        <strong>Thapar Guest Room Management System</strong>.
        We have successfully received your request.
      </p>

      <div class="details-box">
        <div class="details-title">Enquiry Summary</div>
        <p>
          <strong>Check-in:</strong>
          ${new Date(e.from).toDateString()} ${e.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(e.to).toDateString()} ${e.checkOutTime || ""}
        </p>
        <p><strong>Guests:</strong> ${e.guests || 1}</p>
      </div>

      <p>
        Our team will review your enquiry and update you via email once a
        decision is made.
      </p>

      <p>
        Kindly do not reply to this email. For any updates, please wait for
        further communication from the Guest Room Administration.
      </p>

      <p>
        Regards,<br/>
        <strong>Thapar Guest Room Management</strong><br/>
        Thapar Institute of Engineering & Technology
      </p>
    `,
  });
}
