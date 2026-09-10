import crypto from "crypto";

const equal = (a, b) => crypto.timingSafeEqual(
  crypto.createHash("sha256").update(a).digest(),
  crypto.createHash("sha256").update(b).digest()
);

export const protectSocietyPortalVenueWrite = (req, res, next) => {
  const provided = req.get("x-society-portal-venue-key");
  if (!provided) return res.status(401).json({ success: false, code: "WRITE_KEY_REQUIRED", message: "Missing Society Portal write key" });
  const expected = (process.env.VENUE_SOCIETY_PORTAL_WRITE_API_KEY || "").trim();
  const readKeys = [process.env.VENUE_API_KEY, ...(process.env.VENUE_API_KEYS || "").split(",")]
    .map(key => (key || "").trim()).filter(Boolean);
  // Fail closed if a deployment accidentally reuses a read credential.
  if (!expected || readKeys.some(key => equal(key, expected))) {
    return res.status(503).json({ success: false, code: "WRITE_INTEGRATION_UNAVAILABLE", message: "Society Portal booking integration is not configured" });
  }
  if (!equal(provided, expected)) return res.status(403).json({ success: false, code: "INVALID_WRITE_KEY", message: "Invalid Society Portal write key" });
  return next();
};
