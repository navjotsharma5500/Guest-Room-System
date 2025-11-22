import { resend, SENDER_EMAIL } from "./emailClient.js";

export const sendBookingEmail = async (email, booking) => {
  try {
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: "Your Guest Room Booking Confirmation",
      html: `
        <h2>Booking Confirmed</h2>
        <p>Dear ${booking.guestName},</p>
        <p>Your booking has been successfully submitted.</p>
        
        <h3>Booking Details</h3>
        <p><b>Hostel:</b> ${booking.hostelName}</p>
        <p><b>Room:</b> ${booking.roomNo}</p>
        <p><b>From:</b> ${new Date(booking.startDate).toDateString()}</p>
        <p><b>To:</b> ${new Date(booking.endDate).toDateString()}</p>

        <br />
        <p>Thank you.</p>
      `,
    });
  } catch (err) {
    console.log("Email send error:", err);
  }
};
