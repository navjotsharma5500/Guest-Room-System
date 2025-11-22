import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API);

// DEFAULT SENDER
export const SENDER_EMAIL = "Guest Room <no-reply@yourdomain.com>";
