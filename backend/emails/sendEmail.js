import { resend } from "./emailClient.js";

const FALLBACK_EMAIL = process.env.FALLBACK_EMAIL;

if (!FALLBACK_EMAIL) {
  throw new Error("FALLBACK_EMAIL is not defined in environment variables");
}

export const sendEmail = async ({ to, subject, html, from }) => {
  try {
    const payload = {
      from: from || FALLBACK_EMAIL,
      to,
      subject,
      html,
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("EMAIL PAYLOAD:", payload);
    }

    const response = await resend.emails.send(payload);
    return response;

  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    throw error;
  }
};
