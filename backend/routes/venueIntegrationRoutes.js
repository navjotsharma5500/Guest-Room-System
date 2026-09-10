import express from "express";
import { getVenueAvailability, getVenueCatalog } from "../controllers/venueIntegrationController.js";
import { protectVenueIntegration } from "../middleware/venueIntegrationAuth.js";
import { protectSocietyPortalVenueWrite } from "../middleware/societyPortalVenueAuth.js";
import { bookSocietyEvent } from "../controllers/societyEventBookingController.js";

const router = express.Router();

// Dedicated write authentication must run before the shared read-key guard.
router.post("/society-events/book", protectSocietyPortalVenueWrite, bookSocietyEvent);
router.use(protectVenueIntegration);
router.get("/venue-catalog", getVenueCatalog);
router.get("/venues", getVenueAvailability);
router.post("/book-room", (_req, res) =>
  res.status(410).json({
    success: false,
    message: "This integration is availability-only. Booking requests are not accepted.",
  })
);

export default router;
