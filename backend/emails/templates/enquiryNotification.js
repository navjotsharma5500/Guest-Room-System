import masterTemplate from "./masterTemplate.js";

export default function enquiryNotification({
  guestName,
  guestEmail,
  guestPhone,
  purpose,
  checkIn,
  checkOut,
  message
}) {
  return masterTemplate({
    title: `New Guest Room Enquiry – ${guestName}`,
    content: `
      <p>Dear Admin/Manager,</p>

      <p>
        A new guest room enquiry has been submitted by 
        <strong>${guestName}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Enquiry Details</div>
        <p><strong>Name:</strong> ${guestName}</p>
        <p><strong>Email:</strong> ${guestEmail}</p>
        <p><strong>Phone:</strong> ${guestPhone}</p>
        <p><strong>Purpose:</strong> ${purpose}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
        <p><strong>Message:</strong> ${message || "No additional message"}</p>
      </div>

      <p>
        Kindly review the enquiry and take necessary action.
      </p>
    `
  });
}
