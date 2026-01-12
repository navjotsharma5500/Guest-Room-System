import masterTemplate from "./masterTemplate.js";

export default function caretakerDirectBooking(b) {
  return masterTemplate({
    title: `Guest Room Direct Booking – ${b.guest}`,
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
          <p><strong>Bank Details:</strong><br/>
            State Bank of India<br/>
            A/C: <strong>65181840370</strong><br/>
            IFSC: <strong>SBIN0050244</strong>
          </p>
          <p>The guest has been asked to upload the payment slip.</p>
        `
          : ""
      }

      <p>This booking notification has been sent to the warden and management.</p>
    `
  });
}
