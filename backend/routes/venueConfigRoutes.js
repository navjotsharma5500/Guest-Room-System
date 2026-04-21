import express from "express";
import { protect } from "../middleware/auth.js";
import { isVenueFullAccessRole } from "../utils/venueAccessPolicy.js";
import {
  createVenueMainTab,
  createVenueRoom,
  createVenueSection,
  getVenueConfig,
  toggleVenueConfigItem,
} from "../controllers/venueConfigController.js";

const router = express.Router();

const fullVenueAccessOnly = (req, res, next) => {
  if (!req.user || !isVenueFullAccessRole(req.user.role)) {
    return res.status(403).json({ message: "Admin, Adosa, or Assistant access required" });
  }
  next();
};

router.get("/", getVenueConfig);
router.post("/tab", protect, fullVenueAccessOnly, createVenueMainTab);
router.post("/section", protect, fullVenueAccessOnly, createVenueSection);
router.post("/room", protect, fullVenueAccessOnly, createVenueRoom);
router.patch("/toggle", protect, fullVenueAccessOnly, toggleVenueConfigItem);

export default router;
