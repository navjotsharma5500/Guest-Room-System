import { sendEmail } from "./sendEmail.js";
import enquiryNotification from "./templates/enquiryNotification.js";
import { ADMIN_NOTIFICATION_EMAIL } from "./emailClient.js";

export const sendEnquiryNotification = async (enquiry) => {
  await sendEmail({
    to: [ADMIN_NOTIFICATION_EMAIL],   // ALWAYS goes to your email
    subject: "New Guest Enquiry Received",
    html: enquiryNotification(enquiry),
  });
};
