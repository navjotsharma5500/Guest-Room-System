import venueMasterTemplate from "../../../templates/venueMasterTemplate.js";

export default function enquiryRejected(data) {
  return {
    subject: "Venue Enquiry Rejected",
    html: venueMasterTemplate({
      title: "Venue Enquiry Rejected",
      skipDefaultButton: true,
      content: `
      <p style="margin-top:0;">Dear ${data.name},</p>

      <p>
        We regret to inform you that your venue enquiry has been <strong>rejected</strong> by the ProVC Office. 
        Please find the details below for your reference.
      </p>

      <!-- REJECTION DETAILS -->
      <div style="
        background:#fef2f2;
        border-left:6px solid #dc2626;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        font-size:14.5px;
        text-align:center;
      ">
        <div style="font-weight:600;margin-bottom:10px;color:#dc2626;">
          Enquiry Details
        </div>

        <strong>Venue:</strong> ${data.roomNo}<br/>
        <strong>Event:</strong> ${data.eventName}<br/>
        <strong>Reason:</strong> ${data.rejectionReason || 'Not specified'}<br/>
      </div>

      <!-- OPTIONAL VENUE IMAGE -->
      ${data.venueImage ? `
      <div style="text-align:center; margin:20px 0;">
        <img src="${data.venueImage}" alt="Venue Image" style="width:100%; max-width:600px; border-radius:12px; display:block;">
      </div>
      ` : ''}

      <p style="font-weight:600;margin-bottom:6px;text-align:left;">
        Instructions:
      </p>

      <ul style="padding-left:18px;margin-top:6px;text-align:left;">
        <li><strong style="color:#2563eb;">For any PA / WiFi / Technical Requirements Contact CITM Office Directly at <a href="mailto:sukhdevsingh@thapar.edu">sukhdevsingh@thapar.edu</a></strong></li>
        <li>You may contact the ProVC Office for further clarification or alternate bookings</li>
        <li><strong style="color:#dc2626;">In the event of an emergency, the institute reserves the right to relocate the originally booked venue to an alternative venue.</strong></li>
        <li>Keep this email for your records</li>
      </ul>

      <p>
        We apologize for any inconvenience caused.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>ProVC Office</strong>
      </p>
    `,
    }),
  };
}


