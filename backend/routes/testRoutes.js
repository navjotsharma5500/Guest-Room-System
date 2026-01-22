// backend/routes/testRoutes.js
import express from "express";
import { sendEmail } from "../emails/sendEmail.js";

const router = express.Router();

router.get("/test-email", (req, res) => {
  // 🔥 DO NOT await
  sendEmail({
    to: process.env.ADMIN_NOTIFICATION_EMAIL,
    subject: "Test Email – Guest Room System",
    html: "<h2>Email system working</h2>",
    text: "Email system working",
  })
    .then((ok) => {
      console.log("[TEST EMAIL RESULT]:", ok);
    })
    .catch((err) => {
      // This should never happen, but log defensively
      console.error("[TEST EMAIL ERROR]:", err);
    });

  // ✅ IMMEDIATE RESPONSE (Cloudflare-safe)
  res.status(200).json({
    success: true,
    message: "Email triggered (async)",
  });
});

export default router;
