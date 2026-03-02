// backend/emails/templates/extensionApproved.js
import masterTemplate from "./masterTemplate.js";

export default function extensionApproved(data) {
  return masterTemplate({
    title: "Extension Request Approved",
    content: `
      <p style="color: #475569; font-size: 14px;">
        Dear ${data.guestName},
      </p>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        We are pleased to inform you that your request to extend your stay at <strong>${data.hostel}</strong>, Room <strong>${data.roomNo}</strong> has been <strong>approved</strong>.
      </p>

      <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #bbf7d0;">
        <div style="font-weight: 700; color: #166534; margin-bottom: 8px;">Approved Details</div>
        <p style="margin: 4px 0;"><strong>New Checkout Date:</strong> ${new Date(data.newCheckout).toDateString()}</p>
        ${data.approvedAmount > 0 ? `<p style="margin: 4px 0;"><strong>Additional Amount Payable:</strong> ₹${data.approvedAmount}</p>` : ""}
      </div>

      <p style="color: #475569; font-size: 14px;">
        Please proceed with any necessary payments or formalities at the reception.
      </p>

      <p style="margin-top: 25px; font-size: 12px; color: #94a3b8;">
        This is an automated notification from the Thapar Institutional Management System.
      </p>
    `,
    skipDefaultButton: true
  });
}
