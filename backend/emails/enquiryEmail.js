import { sendEmail } from "./sendEmail.js";
import enquiryNotification from "./templates/enquiryNotification.js";

export const sendEnquiryNotification = async (enquiry) => {
  await sendEmail({
    to: ["admin@thapar.edu", "manager@thapar.edu"],
    subject: "New Guest Enquiry Submitted",
    html: enquiryNotification(enquiry),
  });
};
