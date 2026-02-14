// caretakerBookingExtendedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingExtendedPaid(b) {
  const balance = Number(b.balanceAmount || 0);

  return masterTemplate({
    title: "Guest Room Booking Extended (Paid)",
    content: `
      <p style="margin-top:0;">Dear Caretaker,</p>

      <p>
        The stay for the following guest has been <strong>extended with additional payment</strong>. 
        Please review the updated booking and payment details below.
      </p>

      <!-- UPDATED BOOKING -->
      <div style="
        background:#f8fafc;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        text-align:left;
        font-size:14.5px;
      ">

        <div style="font-weight:600;margin-bottom:10px;color:#0f4c81;">
          Updated Booking Details
        </div>

        <strong>Guest Name:</strong> ${b.guest}<br/>
        <strong>Contact Number:</strong> ${b.contact || "—"}<br/>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Previous Check-out:</strong> ${b.previousTo ? new Date(b.previousTo).toDateString() : "—"}<br/>
        <strong>New Check-out:</strong> ${b.to ? new Date(b.to).toDateString() : "—"}
      </div>

      <!-- PAYMENT INFORMATION -->
      <div style="
        background:#eef6ff;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        text-align:left;
        font-size:14.5px;
      ">

        <div style="font-weight:600;margin-bottom:10px;color:#0f4c81;">
          Payment Information
        </div>

        <strong>Extension Amount:</strong> ₹${b.extensionAmount || 0}<br/>
        <strong>Total Booking Amount:</strong> ₹${b.totalAmount || 0}<br/>
        <strong>Amount Paid:</strong> ₹${b.paidAmount || 0}
        ${
          balance > 0
            ? `<br/><strong>Balance Due:</strong> ₹${balance}`
            : ""
        }
      </div>

      ${
        balance > 0
          ? `
          <div style="
            background:#fff4f4;
            border-radius:12px;
            padding:16px 18px;
            margin:16px 0;
            text-align:left;
            font-size:14.5px;
          ">
            <strong style="color:#b91c1c;">Action Required:</strong><br/>
            Please verify the payment receipt submitted by the guest. The guest has been instructed 
            to complete the pending payment and provide proof at the time of reporting.
          </div>
        `
          : ""
      }

      ${
        b.extendRemarks
          ? `
            <div style="
              background:#fefce8;
              border-radius:12px;
              padding:16px 18px;
              margin:16px 0;
              text-align:left;
              font-size:14.5px;
            ">
              <strong style="color:#92400e;">Extension Remarks:</strong><br/>
              ${b.extendRemarks}
            </div>
          `
          : ""
      }

      <p>
        Kindly ensure that accommodation arrangements are continued accordingly 
        and assist the guest as required.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>Guest Room Administration</strong>
      </p>
    `,
  });
}
