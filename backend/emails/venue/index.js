import { getEmailAuthorityByRoom } from "./venueEmailDispatcher.js";
import { buildEmailContext } from "./venueEmailContext.js";
import resolveTemplate from "./templates/index.js";
import { logEmail } from "./venueEmailLogger.js";

const ADMIN_OFFICER_EMAIL = "adminofficer@thapar.edu";
const ADMIN_AUDITORIUMS = [
  "Main Auditorium",
  "TAN Auditorium",
  "Dean's Auditorium",
  "C-Hall",
];

const normalizeVenueToken = (value = "") => String(value || "").trim().toLowerCase();

const shouldNotifyAdminOfficer = (data = {}) => {
  const venueCandidates = [
    data.venueName,
    data.hall,
    data.roomNo,
  ];

  return venueCandidates.some((value) =>
    ADMIN_AUDITORIUMS.some(
      (auditorium) => normalizeVenueToken(auditorium) === normalizeVenueToken(value)
    )
  );
};

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

    const notifyAdminOfficer = shouldNotifyAdminOfficer(data);
    if (notifyAdminOfficer) {
      context.cc = Array.from(new Set([...(context.cc || []), ADMIN_OFFICER_EMAIL]));
    }

    console.log("📧 Admin officer notified:", notifyAdminOfficer);

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
