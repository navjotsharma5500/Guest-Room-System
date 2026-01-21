import { sendEmail } from "./sendEmail.js";
import enquiryNotification from "./templates/enquiryNotification.js";

export const sendEnquiryNotification = async (enquiry) => {
  // Fire-and-forget — DO NOT block enquiry flow
  sendEmail({
    to: process.env.ADMIN_NOTIFICATION_EMAIL,
    subject: "New Guest Enquiry Received",
    html: enquiryNotification(enquiry),
    meta: {
      type: "enquiry-notification",
      enquiryId: enquiry._id,
    },
  }).catch(() => {});
};
