import express from "express";
import {
  getGuestRoomVisitorCount,
  recordGuestRoomVisit,
} from "../controllers/publicGuestRoomVisitController.js";

const router = express.Router();

router.post("/visit", recordGuestRoomVisit);
router.get("/visitor-count", getGuestRoomVisitorCount);

export default router;
