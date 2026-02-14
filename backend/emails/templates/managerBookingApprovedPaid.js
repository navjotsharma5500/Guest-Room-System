import masterTemplate from "./masterTemplate.js";

export default function managerBookingApprovedPaid(b) {
  const amount = b.totalAmount || b.amount || 0;

  return masterTemplate({
    title: `Guest Room Booking Approved — ${b.guest}`,
    content: `
      <p>Dear Manager,</p>

      <p>
        This is to inform you that a guest room booking has been
        <strong>successfully approved</strong> for the following guest.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
        <p><strong>Total Amount Payable:</strong> ₹${amount}</p>
      </div>

      <div class="details-box">
        <div class="details-title">Payment Status</div>
        <p>
          The guest has been notified to complete the payment and submit
          the payment receipt to the respective hostel caretaker
          for verification.
        </p>
      </div>

      <p>
        This notification is shared for administrative reference and records.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
