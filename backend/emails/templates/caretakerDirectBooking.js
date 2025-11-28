import masterTemplate from "./masterTemplate.js";

export default function caretakerDirectBooking({
  guestName,
  caretakerName,
  hostelName,
  roomNo,
  checkIn,
  checkOut,
  amount = null
}) {
  return masterTemplate({
    title: `Guest Room Direct Booking – ${guestName}`,
    content: `
      <p>Dear <strong>${caretakerName}</strong>,</p>

      <p>
        You have successfully made a <strong>direct booking</strong> for 
        <strong>${guestName}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>

        ${
          amount
            ? `<p><strong>Amount Payable:</strong> ₹${amount}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      ${
        amount
          ? `
          <p><strong>Bank Details:</strong><br/>
            State Bank of India<br/>
            A/C: <strong>65181840370</strong><br/>
            IFSC: <strong>SBIN0050244</strong>
          </p>
          <p>The guest has been asked to upload payment slip.</p>
        `
          : ""
      }

      <p>This booking notification has been sent to the warden and management.</p>
    `
  });
}
