import venueMasterTemplate from "../../../templates/venueMasterTemplate.js";

export default function bookingCancelled(data) {
  return {
    subject: "Venue Booking Cancelled",
    html: venueMasterTemplate({
      title: "Venue Booking Cancelled",
      skipDefaultButton: true,
      content: `
      <p style="margin-top:0;">Dear ${data.name},</p>

      <p>
        Your venue booking has been <strong>cancelled</strong> by the ProVC Office. 
        Please find the details below for your reference.
      </p>

      <!-- BOOKING DETAILS -->
      <div style="
        background:#fef2f2;
        border-left:6px solid #dc2626;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        font-size:14.5px;
      ">
        <div style="font-weight:600;margin-bottom:10px;color:#dc2626;">
          Booking Details
        </div>

        <strong>Booking ID:</strong> ${data._id}<br/>
        <strong>Venue:</strong> ${data.roomNo}<br/>
        <strong>Event:</strong> ${data.eventName}<br/>
        ${data.cancellationRemarks ? `<strong>Reason:</strong> ${data.cancellationRemarks}<br/>` : ''}
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
        <li>If you had any scheduled arrangements, please cancel or reschedule as needed</li>
        <li>Contact the ProVC Office for any queries regarding your booking</li>
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
