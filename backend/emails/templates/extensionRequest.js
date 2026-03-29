
// backend/emails/templates/extensionRequest.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function extensionRequest(data) {
  return masterTemplate({
    title: "Extension Request Submitted",
    content: `
      <p style="color: #475569; font-size: 14px;">
        Dear ${data.roleName},
      </p>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        A guest has submitted a request to extend their stay in the Guest Room system.
      </p>

      <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 4px 0;"><strong>Guest Name:</strong> ${data.guestName}</p>
        <p style="margin: 4px 0;"><strong>Room Number:</strong> ${data.roomNo}</p>
        <p style="margin: 4px 0;"><strong>Current Checkout:</strong> ${formatDateIST(data.oldCheckout)}</p>
        <p style="margin: 4px 0;"><strong>Requested Extension Until:</strong> ${formatDateIST(data.requestedCheckout)}</p>
      </div>

      <p style="color: #475569; font-size: 14px;">
        Kindly log in to the dashboard and review the extension request at your earliest convenience.
      </p>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://campusconnect.thapar.edu"
           style="background-color: #dc2626; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-size: 14px;">
           Open Dashboard
        </a>
      </div>

      <p style="margin-top: 25px; font-size: 12px; color: #94a3b8;">
        This is an automated notification from the Thapar Institutional Management System.
      </p>
    `,
    skipDefaultButton: true
  });
}
