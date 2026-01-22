// backend/emails/sendEmail.js
import transporter from "../utils/smtpTransport.js";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export async function sendEmail({
  to,
  subject,
  html,
  text,
}) {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to,
        subject,
        text: text || "Please view this email in an HTML-compatible email client.",
        html,

        // ✅ Thapar Logo (CID)
        attachments: [
          {
            filename: "thapar_logo.png",
            path: "/var/www/Guest-Room-System/backend/assets/thapar_logo.png",
            cid: "thapar_logo",
          },
        ],
      });

      console.log(`[EMAIL] Sent to ${to} (attempt ${attempt})`);
      return true;

    } catch (err) {
      console.error(
        `[EMAIL] Failed attempt ${attempt} to ${to}:`,
        err.message
      );

      if (attempt < maxRetries) {
        await sleep(1500);
      }
    }
  }

  return false; // never break user flow
}
