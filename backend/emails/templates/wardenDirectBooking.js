import masterTemplate from "./masterTemplate.js";

export default function wardenDirectBooking(b) {
  return masterTemplate({
    title: `Direct Guest Room Booking – ${b.guest}`,
    content: `
      <p>Dear <strong>Warden</strong>,</p>

      <p>
        This is to inform you that the hostel caretaker has made a 
        <strong>direct booking</strong> for <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>

        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p><strong>Check-in:</strong> ${b.from}</p>
        <p><strong>Check-out:</strong> ${b.to}</p>

        ${
          b.amount
            ? `<p><strong>Amount:</strong> ₹${b.amount}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      <p>
        This email is for your information and necessary record.
      </p>
    `
  });
}
