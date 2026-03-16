import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function managerDirectBooking(b) {
  const amount = b.totalAmount || b.amount || 0;

  return masterTemplate({
    title: `Direct Guest Room Booking — ${b.guest}`,
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that a <strong>direct guest room booking</strong>
        has been created by the hostel caretaker for
        <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${formatDateIST(b.from)} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${formatDateIST(b.to)} ${b.checkOutTime || ""}
        </p>
      </div>

      ${
        amount > 0
          ? `
          <div class="details-box">
            <div class="details-title">Payment Information</div>
            <p><strong>Payment Status:</strong> Received</p>
            <p><strong>Amount Collected:</strong> ₹${amount}</p>
          </div>
        `
          : `
          <div class="details-box">
            <div class="details-title">Payment Information</div>
            <p><strong>Payment Status:</strong> Complimentary / Not Applicable</p>
          </div>
        `
      }

      <p>
        This notification is shared for administrative reference and official records.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
