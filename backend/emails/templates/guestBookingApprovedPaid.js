import masterTemplate from "./masterTemplate.js";

export default function guestBookingApprovedPaid(b) {
  return masterTemplate({
    title: "Paid Guest Room Booking Approved",
    content: `
      <p>Dear <strong>${b.guest}</strong>,</p>

      <p>
        Your paid guest room booking request has been 
        <strong style="color:#b30000;">approved</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
        <p><strong>Amount to Pay:</strong> ₹${b.amount}</p>
      </div>

      <p><strong>Bank Details:</strong></p>
      <p>
        Bank Name: State Bank of India<br/>
        Account No.: <strong>65181840370</strong><br/>
        IFSC Code: <strong>SBIN0050244</strong>
      </p>

      <p>
        Kindly share the payment slip on this email after completing the transaction.
      </p>

      <p>
        Please meet the hostel caretaker upon arrival for further assistance.
      </p>

      <p>Thank you.</p>
    `
  });
}
