import { resend, SENDER_EMAIL } from "./emailClient.js";

export const sendTokenApprovalEmail = async (email, token) => {
  try {
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: "Your Guest Room Booking Token",
      html: `
        <h2>Token Approved</h2>
        <p>Your token for extended guest room booking has been approved.</p>

        <h3>Your Token:</h3>
        <p style="font-size:20px;font-weight:bold;">${token}</p>

        <p>This token can be used only once.</p>
      `,
    });
  } catch (err) {
    console.log("Email send error:", err);
  }
};
