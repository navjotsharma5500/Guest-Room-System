// wardenDirectBooking.js
import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function wardenDirectBooking(b) {
  const amount = Number(b.amount || 0);

  return masterTemplate({
    title: `Direct Guest Room Booking — ${b.guest}`,
    content: `
      <p>Dear Warden,</p>

      <p>
        This is to inform you that a <strong>direct guest room booking</strong>
        has been made by the hostel caretaker for
        <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${formatDateIST(b.from)} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${formatDateIST(b.to)} ${b.checkOutTime || ""}
        </p>
        ${
          amount > 0
            ? `<p><strong>Amount Payable:</strong> ₹${amount.toFixed(2)}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      <p>
        Kindly note this booking for your records. The caretaker has been
        instructed to manage room readiness and guest coordination.
      </p>
    `,
  });
}
