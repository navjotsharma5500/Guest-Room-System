// caretakerBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedPaid(b) {
  const total = b.totalAmount || b.amount || 0;
  const paid = b.paidAmount || 0;
  const balance = b.balanceAmount ?? total - paid;

  return masterTemplate({
    title: "Guest Room Booking Approved (Paid)",
    content: `
      <p>Dear Caretaker,</p>

      <p>
        A <strong>paid guest room booking</strong> has been approved.
        Kindly find the booking and payment details below.
      </p>

      <div class="details">
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact Number:</strong> ${b.contact || "-"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room Number:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} at ${b.checkInTime || "—"}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} at ${b.checkOutTime || "—"}
        </p>
        <p><strong>Total Amount:</strong> ₹${total}</p>
        <p><strong>Paid Amount:</strong> ₹${paid}</p>
        <p><strong>Balance Amount:</strong> ₹${balance}</p>
        <p><strong>Payment Type:</strong> Paid</p>
      </div>

      <p>
        <strong>Important Instructions:</strong>
      </p>

      <ul>
        <li>
          Please verify the guest’s payment slip at the time of reporting.
        </li>
        <li>
          If any balance amount is pending, guide the guest to complete the payment
          as per hostel procedure.
        </li>
        <li>
          Ensure valid identification is checked before room handover.
        </li>
      </ul>

      <p>
        In case of any discrepancy, please coordinate with the Dosa office.
      </p>
    `,
  });
}
