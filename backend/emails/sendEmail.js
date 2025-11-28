import { Resend } from "resend";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const response = await resend.emails.send({
      from: "TIET Guest Room <noreply@tiet.edu>",
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT →", subject, to);
    return response;
  } catch (err) {
    console.error("EMAIL ERROR →", err.message);
  }
};
