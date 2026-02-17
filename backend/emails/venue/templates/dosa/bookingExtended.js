import venueMasterTemplate from "../../../templates/venueMasterTemplate.js";

export default function bookingExtended(data) {
  const extension = data.extensionHistory[data.extensionHistory.length - 1];

  return {
    subject: "Venue Booking Extended",
    html: venueMasterTemplate({
      title: "Venue Booking Extended",
      skipDefaultButton: true,
      content: `
      <p style="margin-top:0;">Dear ${data.name},</p>

      <p>
        Your venue booking has been <strong>extended</strong> by the DoSA Office. 
        Please find the updated details below.
      </p>

      <!-- EXTENDED BOOKING DETAILS -->
      <div style="
        background:#fff7ed;
        border-left:6px solid #ea580c;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        font-size:14.5px;
      ">
        <div style="font-weight:600;margin-bottom:10px;color:#ea580c;">
          Updated Booking Details
        </div>

        <strong>Booking ID:</strong> ${data._id}<br/>
        <strong>Venue:</strong> ${data.roomNo}<br/>
        <strong>Original Booked Till:</strong> ${extension.originalCheckOutDate} ${extension.originalCheckOutTime}<br/>
        <strong>New Booked Till:</strong> ${extension.newCheckOutDate} ${extension.newCheckOutTime}<br/>
        ${extension.remarks ? `<strong>Remarks:</strong> ${extension.remarks}<br/>` : ''}
      </div>

      <!-- OPTIONAL VENUE IMAGE -->
      ${data.venueImage ? `
      <div style="text-align:center; margin:20px 0;">
        <img src="${data.venueImage}" alt="Venue Image" style="width:100%; max-width:600px; border-radius:12px; display:block;">
      </div>
      ` : ''}

      <p style="font-weight:600;margin-bottom:6px;">
        Instructions:
      </p>

      <ul style="padding-left:18px;margin-top:6px;">
        <li><strong style="color:#2563eb;">For any PA / WiFi / Technical Requirements Contact CITM Office Directly</strong></li>
        <li>Update any scheduled arrangements according to the new booking time</li>
        <li>Contact the DoSA Office for any queries regarding your booking extension</li>
        <li>Keep this email for your records</li>
      </ul>

      <p>
        We hope this extension is helpful and apologize for any inconvenience.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>DoSA Office</strong>
      </p>
    `,
    }),
  };
}
