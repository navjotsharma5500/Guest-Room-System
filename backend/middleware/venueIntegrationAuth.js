import crypto from "crypto";

const configuredKeys = () => {
  const values = [
    process.env.VENUE_API_KEY,
    ...(process.env.VENUE_API_KEYS || "").split(","),
  ];

  return values.map((value) => String(value || "").trim()).filter(Boolean);
};

const constantTimeEqual = (provided, expected) => {
  const providedDigest = crypto.createHash("sha256").update(provided).digest();
  const expectedDigest = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
};

export const protectVenueIntegration = (req, res, next) => {
  const apiKey = req.get("x-venue-api-key");

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "Missing API key",
    });
  }

  const valid = configuredKeys().some((key) => constantTimeEqual(apiKey, key));
  if (!valid) {
    return res.status(403).json({
      success: false,
      message: "Invalid API key",
    });
  }

  return next();
};

