// backend/routes/testRoutes.js
import express from "express";
import { sendEmail } from "../emails/sendEmail.js";

const router = express.Router();

router.get("/test-email", (req, res) => {
  console.log("🧪 [TEST ROUTE] /test-email HIT", {
    time: new Date().toISOString(),
    adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL,
  });

  console.log("🧪 [TEST ROUTE] Triggering sendEmail()");

  sendEmail({
    to: process.env.ADMIN_NOTIFICATION_EMAIL,
    subject: "Test Email – Guest Room System",
    html: "<h2>Email system working</h2>",
    text: "Email system working",
  })
    .then((ok) => {
      console.log("🧪 [TEST ROUTE] sendEmail resolved:", ok);
    })
    .catch((err) => {
      console.error("🧪 [TEST ROUTE] sendEmail rejected:", {
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
    });

  res.status(200).json({
    success: true,
    message: "Email triggered (async)",
  });
});

export default router;
