import nodemailer from "nodemailer";

const ddTransport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: process.env.EMAIL_SECURE === "true" || true,
  auth: {
    user: process.env.DD_EMAIL_USER,
    pass: process.env.DD_EMAIL_PASS,
  },
});

export default ddTransport;