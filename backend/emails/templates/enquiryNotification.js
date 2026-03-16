import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function enquiryNotification(e) {
  return masterTemplate({
    title: "New Guest Room Enquiry Received",
    content: `
      <p style="margin-top:0;">Dear Team,</p>

      <p>
        A new guest room enquiry has been successfully submitted through the 
        Guest Room Management System. Please find the details below for review 
        and necessary action.
      </p>

      <div style="
        background:#f8fafc;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        text-align:left;
        font-size:14.5px;
      ">

        <div style="font-weight:600;margin-bottom:10px;color:#0f4c81;">
          Enquiry Details
        </div>

        <strong>Name:</strong> ${e.name}<br/>
        <strong>Email:</strong> ${e.email}<br/>
        <strong>Contact Number:</strong> ${e.contact}<br/>
        <strong>Purpose of Stay:</strong> ${e.purpose || "—"}<br/>
        <strong>Check-in:</strong> ${formatDateIST(e.from)} at ${e.checkInTime}<br/>
        <strong>Check-out:</strong> ${formatDateIST(e.to)} at ${e.checkOutTime}<br/>
        <strong>Reference:</strong> ${e.reference || "—"}

      </div>

      <p>
        Kindly log in to the Guest Room Management dashboard to review, verify, 
        and process this enquiry in accordance with institute guidelines.
      </p>

      <p>
        If no immediate action is required, this email may be treated as an 
        informational notification.
      </p>

      <p style="margin-bottom:0;">
        Thank you for your prompt attention.
      </p>
    `,
  });
}
