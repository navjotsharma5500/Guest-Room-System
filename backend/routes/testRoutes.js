// backend/routes/testRoutes.js
import express from "express";
import { sendEmail } from "../emails/sendEmail.js";

const router = express.Router();

router.get("/test-email", (req, res) => {
  // 1️⃣ Respond immediately (Cloudflare-safe)
  res.json({
    success: true,
    message: "Test email dispatch started. Check inbox/logs.",
  });

  // 2️⃣ Send email in background (DO NOT await)
  const testHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">✅ Guest Room System Test Email</h2>
      <p>Your email system is working perfectly!</p>
      <p>Backend is successfully connected to <strong>Gmail SMTP</strong>.</p>
      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #6b7280; font-size: 14px;">
        Sent from Guest Room Backend
      </p>
    </div>
  `;

  sendEmail({
    to: "navjot.sharma@thapar.edu",
    subject: "✅ Test Email from Guest Room Backend",
    html: testHtml,
    meta: {
      type: "test-email",
    },
  })
    .then(() => {
      console.log("✅ Test email sent successfully");
    })
    .catch((err) => {
      console.error("❌ Test email failed:", err.message);
    });
});

export default router;
