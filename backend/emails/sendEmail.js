import transporter from "../utils/smtpTransport.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
  meta = {},
}) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
    text,
    replyTo,
    attachments: [
      {
        filename: 'thapar_logo.png',
        path: path.join(__dirname, '../../assets/thapar_logo.png'),
        cid: 'thapar_logo' // Referenced in template as cid:thapar_logo
      }
    ]
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);

      console.log("📧 Email sent", {
        to,
        subject,
        messageId: info.messageId,
        meta,
      });

      return true;
    } catch (err) {
      console.error(`❌ Email attempt ${attempt} failed`, {
        to,
        subject,
        error: err.message,
        meta,
      });

      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
      }
    }
  }

  console.error("🚨 Email permanently failed after retries", {
    to,
    subject,
    meta,
  });

  return false;
};