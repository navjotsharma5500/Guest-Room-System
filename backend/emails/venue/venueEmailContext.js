import { VENUE_MANDATORY_BCC } from '../../utils/venueAccessPolicy.js';

export const buildEmailContext = ({
  authority,
  guestEmail,
  societyEmail,
  includeSociety,
  includeInternal,
}) => {
  const to = [guestEmail];
  const cc = [];

  // Society is ALWAYS in CC if available
  if (societyEmail) {
    cc.push(societyEmail);
  }

  // Internal office emails (like shabnam.rani for DD)
  if (includeInternal && authority.ccInternal?.length) {
    cc.push(...authority.ccInternal);
  }

  const ENABLE_AUDIT_BCC = process.env.VENUE_EMAIL_BCC !== "false";
  
  // If we are sending to the internal office (e.g. enquiry_received),
  // we don't want to BCC them again if they are already in TO/CC.
  const bcc = ENABLE_AUDIT_BCC ? VENUE_MANDATORY_BCC : [];

  return {
    from: authority.from,
    to,
    cc,
    bcc,
  };
};