import { resend, SENDER_EMAIL } from "./emailClient.js";

export const sendEnquiryEmail = async (email, enquiry) => {
  try {
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: "Your Guest Room Enquiry Received",
      html: `
        <h2>Enquiry Submitted</h2>
        <p>Dear ${enquiry.guestName},</p>
        <p>Your enquiry has been recorded.</p>

        <h3>Details</h3>
        <p><b>Message:</b> ${enquiry.message}</p>
        <p><b>Preferred Date:</b> ${enquiry.preferredDate ? new Date(enquiry.preferredDate).toDateString() : "Not Provided"}</p>

        <br />
        <p>We will contact you soon.</p>
      `,
    });
  } catch (err) {
    console.log("Email send error:", err);
  }
};
