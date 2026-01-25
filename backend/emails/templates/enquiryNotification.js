import masterTemplate from "./masterTemplate.js";

export default function enquiryNotification(e) {
  return masterTemplate({
    title: "New Guest Room Enquiry Received",
    content: `
      <p>Dear Team,</p>

      <p>
        A new guest room enquiry has been submitted through the Guest Room
        Management System. The enquiry details are provided below for your
        review and further action.
      </p>

      <p><strong>Enquiry Details</strong></p>

      <p>
        <strong>Name:</strong> ${e.name}<br/>
        <strong>Email:</strong> ${e.email}<br/>
        <strong>Contact Number:</strong> ${e.contact}<br/>
        <strong>Purpose of Stay:</strong> ${e.purpose || "—"}<br/>
        <strong>Check-in:</strong>
        ${new Date(e.from).toDateString()} at ${e.checkInTime}<br/>
        <strong>Check-out:</strong>
        ${new Date(e.to).toDateString()} at ${e.checkOutTime}<br/>
        <strong>Reference:</strong> ${e.reference || "—"}
      </p>

      <p>
        Kindly log in to the Guest Room Management dashboard to review,
        verify, and process this enquiry as per institute guidelines.
      </p>

      <p>
        If no action is required at this stage, this email may be treated
        as an informational notification.
      </p>
    `,
  });
}
