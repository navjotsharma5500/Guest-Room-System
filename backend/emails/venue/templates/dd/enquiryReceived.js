import venueMasterTemplate from "../../../templates/venueMasterTemplate.js";

export default function enquiryReceived(data) {
  return {
    subject: "Venue Enquiry Received",
    html: venueMasterTemplate({
      title: "Venue Enquiry Received",
      skipDefaultButton: true,
      content: `
      <p style="margin-top:0;">Dear ${data.name},</p>

      <p>
        We have received your venue enquiry for <strong>${data.roomNo}</strong>. 
        You will be notified shortly regarding the approval or booking status.
      </p>

      <!-- ENQUIRY DETAILS -->
      <div style="
        background:#f3f4f6;
        border-left:6px solid #2563eb;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        font-size:14.5px;
      ">
        <div style="font-weight:600;margin-bottom:10px;color:#2563eb;">
          Enquiry Details
        </div>

        <strong>Event:</strong> ${data.eventName}<br/>
        <strong>Society:</strong> ${data.societyName}<br/>
        <strong>Booked From:</strong> ${data.checkInDate} ${data.checkInTime} - ${data.checkOutDate} ${data.checkOutTime} <strong>(Booked Till)</strong><br/>
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
        <li>Wait for confirmation from the ProVC Office regarding your enquiry</li>
        <li>Contact the ProVC Office for any queries regarding your request</li>
        <li><strong style="color:#dc2626;">In the event of an emergency, the institute reserves the right to relocate the originally booked venue to an alternative venue.</strong></li>
        <li>Keep this email for your records</li>
      </ul>

      <p>
        Thank you for your enquiry.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>ProVC Office</strong>
      </p>
    `,
    }),
  };
}


