import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined");
}

if (!process.env.EMAIL_FROM) {
  throw new Error("EMAIL_FROM is not defined");
}

if (!process.env.ADMIN_NOTIFICATION_EMAIL) {
  throw new Error("ADMIN_NOTIFICATION_EMAIL is not defined");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const SENDER_EMAIL = process.env.EMAIL_FROM;
export const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
