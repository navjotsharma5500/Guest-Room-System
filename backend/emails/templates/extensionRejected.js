// backend/emails/templates/extensionRejected.js
import masterTemplate from "./masterTemplate.js";

export default function extensionRejected(data) {
  return masterTemplate({
    title: "Extension Request Rejected",
    content: `
      <p style="color: #475569; font-size: 14px;">
        Dear ${data.guestName},
      </p>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Your request to extend your stay at <strong>${data.hostel}</strong>, Room <strong>${data.roomNo}</strong> has been <strong>rejected</strong>.
      </p>

      <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #fecaca;">
        <div style="font-weight: 700; color: #991b1b; margin-bottom: 8px;">Rejection Details</div>
        <p style="margin: 4px 0;"><strong>Original Checkout:</strong> ${new Date(data.oldCheckout).toDateString()}</p>
        <p style="margin: 4px 0;"><strong>Requested Checkout:</strong> ${new Date(data.requestedCheckout).toDateString()}</p>
        ${data.reason ? `<p style="margin: 4px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
      </div>

      <p style="color: #475569; font-size: 14px;">
        Please ensure you vacate the room by the original checkout date.
      </p>

      <p style="margin-top: 25px; font-size: 12px; color: #94a3b8;">
        This is an automated notification from the Thapar Institutional Management System.
      </p>
    `,
    skipDefaultButton: true
  });
}
