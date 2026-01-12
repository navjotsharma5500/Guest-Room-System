import masterTemplate from "./masterTemplate.js";

export default function guestBookingRejected(b) {
  return masterTemplate({
    title: "Guest Room Booking Request – Rejected",
    content: `
      <p>Dear <strong>${b.guest}</strong>,</p>

      <p>
        We regret to inform you that your guest room booking request 
        <strong style="color:#b30000;">cannot be approved</strong> due to unavailability of rooms.
      </p>

      <p>
        You may submit a new request with alternative dates, and we will be happy to assist you.
      </p>

      <p>Thank you for your understanding.</p>
    `
  });
}
