import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true", // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,              // reuse connections
  maxConnections: 3,
  maxMessages: 100,
  rateLimit: true,
});

// Verify once at boot (non-fatal)
transporter.verify((err) => {
  if (err) {
    console.error("❌ SMTP verification failed:", err.message);
  } else {
    console.log("✅ Gmail SMTP ready");
  }
});

export default transporter;
