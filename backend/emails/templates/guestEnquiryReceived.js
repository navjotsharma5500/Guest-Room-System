// guestEnquiryReceived.js
import masterTemplate from "./masterTemplate.js";

export default function guestEnquiryReceived(e) {
  return masterTemplate({
    title: "Enquiry Received — Thapar Guest Room",
    content: `
      <p>Dear ${e.name},</p>

      <p>
        Thank you for submitting your enquiry to the
        <strong>Thapar Institute Guest Room Management System</strong>.
        We confirm that your request has been received successfully.
      </p>

      <p><strong>Enquiry Summary</strong></p>

      <p>
        <strong>Check-in:</strong>
        ${new Date(e.from).toDateString()} ${e.checkInTime || ""}<br/>
        <strong>Check-out:</strong>
        ${new Date(e.to).toDateString()} ${e.checkOutTime || ""}<br/>
        <strong>Number of Guests:</strong> ${e.guests || 1}
      </p>

      <p>
        Your enquiry will be reviewed by the Guest Room Administration.
        You will be informed by email once a decision has been made.
      </p>

      <p>
        Kindly note that this is an automated acknowledgement.
        Please do not reply to this email.
      </p>

      <p>
        Regards,<br/>
        <strong>Thapar Institute Guest Room Management</strong><br/>
        Thapar Institute of Engineering & Technology
      </p>
    `,
  });
}
