import express from "express";
import { getVenueAvailability } from "../controllers/venueIntegrationController.js";
import { protectVenueIntegration } from "../middleware/venueIntegrationAuth.js";

const router = express.Router();

router.use(protectVenueIntegration);
router.get("/venues", getVenueAvailability);
router.post("/book-room", (_req, res) =>
  res.status(410).json({
    success: false,
    message: "This integration is availability-only. Booking requests are not accepted.",
  })
);

export default router;
