import express from "express";
import { sendEmail } from "../emails/sendEmail.js";

const router = express.Router();

router.get("/test-email", async (req, res) => {
  try {
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">✅ Guest Room System Test Email</h2>
        <p>Your email system is working perfectly! 🎉</p>
        <p>Backend is successfully connected to <strong>Gmail SMTP</strong>.</p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          Sent from: ${process.env.EMAIL_FROM_NAME} &lt;${process.env.EMAIL_FROM_ADDRESS}&gt;
        </p>
      </div>
    `;

    const success = await sendEmail({
      to: "navjot.sharma@thapar.edu",
      subject: "✅ Test Email from Guest Room Backend",
      html: testHtml,
      meta: {
        type: "test-email",
      },
    });

    if (success) {
      console.log("✅ Test email sent successfully");
      res.json({ 
        success: true, 
        message: "Test email sent via Gmail SMTP",
        to: "navjot.sharma@thapar.edu"
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Email failed after retries" 
      });
    }

  } catch (error) {
    console.error("❌ Test email error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;