import express from "express";
import {
  createVenueBookingRequest,
  getVenueAvailability,
} from "../controllers/venueIntegrationController.js";
import { protectVenueIntegration } from "../middleware/venueIntegrationAuth.js";

const router = express.Router();

router.use(protectVenueIntegration);
router.get("/venues", getVenueAvailability);
router.post("/book-room", createVenueBookingRequest);

export default router;

