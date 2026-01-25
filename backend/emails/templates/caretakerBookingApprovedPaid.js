// caretakerBookingApprovedPaid.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedPaid(b) {
  const total = b.totalAmount || b.amount || 0;
  const paid = b.paidAmount || 0;
  const balance = b.balanceAmount ?? total - paid;

  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p>Dear Caretaker,</p>

      <p>
        A guest room booking has been <strong>approved</strong>.
        Please find the booking and payment details below for verification
        and further action.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact Number:</strong> ${b.contact || "—"}</p>
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
      </div>

      <div class="details-box">
        <div class="details-title">Payment Summary</div>
        <p><strong>Total Amount:</strong> ₹${total}</p>
        <p><strong>Amount Paid:</strong> ₹${paid}</p>
        <p><strong>Balance Amount:</strong> ₹${balance}</p>
      </div>

      <p><strong>Instructions:</strong></p>
      <ul>
        <li>Verify the guest’s payment receipt at the time of reporting</li>
        <li>If any balance amount is pending, guide the guest as per hostel procedure</li>
        <li>Ensure valid identification before room handover</li>
      </ul>

      <p>
        In case of any discrepancy, please coordinate with the hostel Manager.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
