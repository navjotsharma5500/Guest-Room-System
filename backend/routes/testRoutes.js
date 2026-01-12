import express from "express";
import { Resend } from "resend";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

router.get("/test-email", async (req, res) => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: "navjot.sharma@thapar.edu",   // your email
      subject: "✔ Test Email from Guest Room Backend",
      html: `
        <h2>Guest Room System Test Email</h2>
        <p>Your email system is working perfectly! 🎉</p>
        <p>Backend is successfully connected to Resend.</p>
      `
    });

    console.log("Test email sent:", response);
    res.json({ success: true, response });

  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({ success: false, error });
  }
});

export default router;
