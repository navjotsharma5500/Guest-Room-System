import { sendEmail } from "./sendEmail.js";
import enquiryNotification from "./templates/enquiryNotification.js";

export const sendEnquiryNotification = async (enquiry) => {
  // Fire-and-forget — DO NOT block enquiry flow
  try {
    // Validate recipient email exists
    if (!process.env.ADMIN_NOTIFICATION_EMAIL) {
      console.warn("⚠️ ADMIN_NOTIFICATION_EMAIL not configured - skipping enquiry notification");
      return;
    }

    if (!enquiry?._id || !enquiry?.email) {
      console.warn("⚠️ Invalid enquiry data - skipping notification");
      return;
    }

    sendEmail({
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: "New Guest Enquiry Received",
      html: enquiryNotification(enquiry),
      meta: {
        type: "enquiry-notification",
        enquiryId: enquiry._id,
      },
    }).catch((err) => {
      console.error("❌ Failed to send enquiry notification:", err.message);
    });
  } catch (err) {
    console.error("❌ Error in sendEnquiryNotification:", err.message);
  }
};