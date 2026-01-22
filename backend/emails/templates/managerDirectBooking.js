// managerDirectBooking.js
import masterTemplate from "./masterTemplate.js";

export default function managerDirectBooking(b) {
  return masterTemplate({
    title: `Direct Guest Room Booking — ${b.guest}`,
    content: `
      <p>Dear Manager,</p>

      <p>
        A <strong>direct guest room booking</strong> has been created by the
        hostel caretaker for <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Summary</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
        ${
          b.amount || b.totalAmount
            ? `<p><strong>Booking Type:</strong> Paid</p>
               <p><strong>Amount:</strong> ₹${b.amount || b.totalAmount}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      <p>
        This notification is shared for your information and record.
      </p>
    `,
  });
}
