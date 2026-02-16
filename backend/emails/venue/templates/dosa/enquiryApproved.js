import masterTemplate from "../../../templates/masterTemplate.js";

export default function enquiryApproved(data) {
  return {
    subject: "Venue Booking Confirmed",
    html: masterTemplate({
      title: "Venue Booking Confirmed",
      skipDefaultButton: true,
      content: `
      <p style="margin-top:0;">Dear ${data.name},</p>

      <p>
        Your venue booking has been <strong>approved</strong> by the DoSA Office. 
        Please find the booking details below for your reference.
      </p>

      <!-- APPROVED BOOKING DETAILS -->
      <div style="
        background:#f0fdf4;
        border-left:6px solid #16a34a;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        font-size:14.5px;
      ">
        <div style="font-weight:600;margin-bottom:10px;color:#16a34a;">
          Booking Details
        </div>

        <strong>Booking ID:</strong> ${data._id}<br/>
        <strong>Venue:</strong> ${data.hall} - ${data.roomNo}<br/>
        <strong>Event:</strong> ${data.eventName}<br/>
        <strong>Society:</strong> ${data.societyName}<br/>
        <strong>Check-in:</strong> ${data.checkInDate} ${data.checkInTime}<br/>
        <strong>Check-out:</strong> ${data.checkOutDate} ${data.checkOutTime}<br/>
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
        <li>Ensure your arrangements are ready for the approved booking</li>
        <li>Contact the DoSA Office for any queries regarding your booking</li>
        <li>Keep this email for your records</li>
      </ul>

      <p>
        We look forward to a successful event at your booked venue.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>DoSA Office</strong>
      </p>
    `,
    }),
  };
}
