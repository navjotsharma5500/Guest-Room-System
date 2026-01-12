import masterTemplate from "./masterTemplate.js";

export default function guestBookingCancelled(b) {
  return masterTemplate({
    title: "Guest Room Booking Cancelled",
    content: `
      <p>Dear <strong>${b.guest}</strong>,</p>

      <p>
        We regret to inform you that your guest room booking has been 
        <strong style="color:#b30000;">cancelled</strong>.
      </p>

      <p>
        If needed, you may submit a new request with alternative dates.
      </p>

      <p>We apologize for the inconvenience.</p>
    `
  });
}
