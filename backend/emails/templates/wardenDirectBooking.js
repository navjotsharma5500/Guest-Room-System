import masterTemplate from "./masterTemplate.js";

export default function wardenDirectBooking({
  wardenName,
  guestName,
  hostelName,
  roomNo,
  checkIn,
  checkOut,
  amount = null
}) {
  return masterTemplate({
    title: `Direct Guest Room Booking – ${guestName}`,
    content: `
      <p>Dear <strong>${wardenName}</strong>,</p>

      <p>
        This is to inform you that the hostel caretaker has made a 
        <strong>direct booking</strong> for <strong>${guestName}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Hostel:</strong> ${hostelName}</p>
        <p><strong>Room No.:</strong> ${roomNo}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>

        ${
          amount
            ? `<p><strong>Amount:</strong> ₹${amount}</p>`
            : `<p><strong>Booking Type:</strong> Free</p>`
        }
      </div>

      <p>
        This email is for your information and necessary record.
      </p>
    `
  });
}
