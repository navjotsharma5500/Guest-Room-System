// backend/emails/templates/extensionReminder.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function extensionReminder(data) {
  const hours = Math.round(data.timeUntilCheckout / 60);
  
  return masterTemplate({
    title: "⏰ Urgent: Extension Request Pending – Checkout Time Approaching",
    content: `
      <p style="color: #dc2626; font-size: 16px; font-weight: bold;">
        ⏰ URGENT: ACTION REQUIRED
      </p>

      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 12px;">
        Dear ${data.roleName},
      </p>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        This is a <strong>critical reminder</strong> that an extension request for the below guest is still <strong style="color: #dc2626;">pending review</strong>, and the scheduled checkout time is <strong style="color: #dc2626;">approaching in approximately ${hours} hour${hours > 1 ? 's' : ''}</strong>.
      </p>

      <p style="color: #7f1d1d; font-size: 13px; background: #fee2e2; padding: 12px; border-radius: 6px; border-left: 4px solid #dc2626; margin: 15px 0;">
        ⚠️ <strong>No action has been taken yet on this request.</strong> Please review and respond immediately to avoid any inconvenience.
      </p>

      <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #bfdbfe;">
        <div style="font-weight: 700; color: #1e40af; margin-bottom: 10px;">📋 Request Details</div>
        <p style="margin: 6px 0;"><strong>Guest Name:</strong> ${data.guestName}</p>
        <p style="margin: 6px 0;"><strong>Contact:</strong> ${data.contact || "—"}</p>
        <p style="margin: 6px 0;"><strong>Hostel:</strong> ${data.hostel}</p>
        <p style="margin: 6px 0;"><strong>Room Number:</strong> ${data.roomNo}</p>
        <p style="margin: 6px 0;"><strong style="color: #dc2626;">Current Checkout:</strong> ${formatDateIST(data.currentCheckout)} (In ~${hours} hour${hours > 1 ? 's' : ''})</p>
        <p style="margin: 6px 0;"><strong>Requested Extension Until:</strong> ${formatDateIST(data.requestedCheckout)}</p>
        <p style="margin: 6px 0;"><strong>Payment Type:</strong> ${data.paymentType}</p>
        ${data.amount > 0 ? `<p style="margin: 6px 0;"><strong>Proposed Amount:</strong> ₹${Number(data.amount).toLocaleString()}</p>` : ""}
      </div>

      <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-size: 13px; color: #92400e;">
          <strong>⏱️ Time Remaining:</strong> Please approve or reject this request within the next ${hours} hour${hours > 1 ? 's' : ''} to ensure timely action.
        </p>
      </div>

      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 15px;">
        Please log in to the dashboard immediately and take necessary action:
      </p>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://campusconnect.thapar.edu"
           style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">
           🔗 Open Dashboard Now
        </a>
      </div>

      <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 20px; border: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          <strong>Approval Authority:</strong> ${data.approvalLevel}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
          <strong>Request ID:</strong> ${data.requestId}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
          <strong>Submitted At:</strong> ${data.submittedAt}
        </p>
      </div>

      <p style="margin-top: 25px; font-size: 12px; color: #94a3b8;">
        This is an automated urgent reminder from the Thapar Institutional Management System. Please respond at your earliest convenience.
      </p>
    `,
    skipDefaultButton: true
  });
}
