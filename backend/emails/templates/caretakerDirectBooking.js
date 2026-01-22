// caretakerDirectBooking.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerDirectBooking(b) {
  return masterTemplate({
    title: `Direct Guest Room Booking — ${b.guest}`,
    content: `
      <p>Dear Caretaker,</p>

      <p>
        A <strong>direct guest room booking</strong> has been created successfully.
        Please find the booking details below.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact:</strong> ${b.contact || "-"}</p>
        <p><strong>Email:</strong> ${b.email || "-"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
        ${
          b.amountToBePaid > 0
            ? `<p><strong>Amount Payable:</strong> ₹${b.amountToBePaid}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      ${
        b.amountToBePaid > 0
          ? `
          <div class="details-box">
            <div class="details-title">Payment Instructions</div>
            <p>
              The guest has been instructed to submit the payment slip to the
              hostel caretaker at the time of reporting or share it via email.
            </p>
            <p><strong>Bank Name:</strong> State Bank of India</p>
            <p><strong>Account Number:</strong> 65181840370</p>
            <p><strong>IFSC Code:</strong> SBIN0050244</p>
          </div>
        `
          : ""
      }

      <p>
        Kindly ensure the room is prepared and assist the guest upon arrival.
      </p>

      <p>
        This notification has also been shared with the warden and administration.
      </p>
    `,
  });
}
