import masterTemplate from "./masterTemplate.js";
import { formatDateIST } from "../utils/dateFormatter.js";

export default function wardenBookingApprovedPaid(b) {
  const amount = b.totalAmount || b.amount || 0;

  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Warden,</p>

      <p>
        This is to inform you that a guest room booking has been
        <strong>approved</strong> for <strong>${b.guest}</strong>.
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
        <p><strong>Total Amount:</strong> ₹${amount}</p>
      </div>

      <p>
        The hostel caretaker has been directed to verify payment
        confirmation during guest check-in.
      </p>

      <p>
        This notification is issued for administrative reference and official records.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
