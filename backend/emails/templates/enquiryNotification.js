import masterTemplate from "./masterTemplate.js";

export default function enquiryNotification(e) {
  return masterTemplate({
    title: "New Guest Room Enquiry Received",
    content: `
      <p>Dear Team,</p>

      <p>
        A new guest room enquiry has been submitted. The details are provided below
        for your review and necessary action.
      </p>

      <div class="details">
        <p><strong>Name:</strong> ${e.name}</p>
        <p><strong>Email:</strong> ${e.email}</p>
        <p><strong>Contact Number:</strong> ${e.contact}</p>
        <p><strong>Purpose of Stay:</strong> ${e.purpose || "-"}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(e.from).toDateString()} at ${e.checkInTime}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(e.to).toDateString()} at ${e.checkOutTime}
        </p>
        <p><strong>Reference:</strong> ${e.reference || "N/A"}</p>
      </div>

      <p>
        Please log in to the Guest Room Management dashboard to review and process
        this enquiry.
      </p>

      <p>
        This notification has been generated automatically by the system.
      </p>
    `,
  });
}
