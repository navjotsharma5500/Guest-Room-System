import { getEmailAuthorityByRoom } from "./venueEmailDispatcher.js";
import { buildEmailContext } from "./venueEmailContext.js";
import resolveTemplate from "./templates/index.js";
import { logEmail } from "./venueEmailLogger.js";

export async function sendVenueEmail({
  type,
  roomNo,
  guestEmail,
  societyEmail,
  data,
}) {
  let context = {};
  let subject = "";
  
  try {
    const authority = getEmailAuthorityByRoom(roomNo);

    const templateResult = resolveTemplate(
      authority.key,
      type,
      data
    );
    subject = templateResult.subject;
    const { html } = templateResult;

    context = buildEmailContext({
      authority,
      guestEmail,
      societyEmail,
      includeInternal: type === "enquiry_received",
    });

    await authority.transporter.sendMail({
      ...context,
      subject,
      html,
    });

    // Log success
    await logEmail(context, subject, type, roomNo, "sent");

  } catch (error) {
    // Log error
    await logEmail(context, subject || "Unknown Subject", type, roomNo, "failed", error);
    throw error;
  }
}