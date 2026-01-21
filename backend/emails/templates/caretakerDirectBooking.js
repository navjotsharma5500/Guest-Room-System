// caretakerDirectBooking.js
export default function caretakerDirectBooking(b) {
  return masterTemplate({
    title: `Guest Room Direct Booking — ${b.guest}`,
    content: `
      <p>Dear <strong>Caretaker</strong>,</p>

      <p>
        You have successfully made a <strong>direct booking</strong> for 
        <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>
        ${
          b.amount
            ? `<p><strong>Amount Payable:</strong> ₹${b.amount}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      ${
        b.amount
          ? `
          <div class="details-box">
            <div class="details-title">Bank Details</div>
            <p><strong>Bank Name:</strong> State Bank of India</p>
            <p><strong>Account No.:</strong> 65181840370</p>
            <p><strong>IFSC Code:</strong> SBIN0050244</p>
          </div>
          <p>The guest has been asked to upload the payment slip.</p>
        `
          : ""
      }

      <p>This booking notification has been sent to the warden and management.</p>
    `
  });
}