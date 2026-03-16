// guestEnquiryReceived.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function guestEnquiryReceived(e) {
  return masterTemplate({
    title: "Guest Room Enquiry Received",
    content: `
      <p>Dear ${e.name},</p>

      <p>
        Thank you for submitting your guest room enquiry to the
        <strong>Thapar Institute Guest Room Management System</strong>.
        We are pleased to confirm that your request has been received successfully.
      </p>

      <div class="details-box">
        <div class="details-title">Enquiry Summary</div>
        <p>
          <strong>Check-in:</strong>
          ${formatDateIST(e.from)} ${e.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${formatDateIST(e.to)} ${e.checkOutTime || ""}
        </p>
        <p>
          <strong>Number of Guests:</strong> ${e.guests || 1}
        </p>
      </div>

      <p>
        Our administration team will review your request and notify you
        by email once a decision has been made.
      </p>

      <p>
        Please note that this is a system-generated acknowledgement.
        Kindly do not reply to this message.
      </p>

      <p>
        Warm regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
