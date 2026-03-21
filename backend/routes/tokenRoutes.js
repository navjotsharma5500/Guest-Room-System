import express from "express";
import {
  requestToken,
  approveToken,
  getTokenRequests,
} from "../controllers/tokenController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Guest request token
router.post("/request", requestToken);

// Admin approve token
router.put("/approve/:id", protect, authorizeRoles("admin"), approveToken);

// Admin get all token requests
router.get("/", protect, authorizeRoles("admin"), getTokenRequests);

export default router;
