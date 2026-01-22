// backend/utils/smtpTransport.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true", // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  // 🔒 ABSOLUTELY REQUIRED
  connectionTimeout: 10_000, // 10s
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

export default transporter;
