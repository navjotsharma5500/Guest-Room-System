import express from "express";
import {
  createSocietyNightRequest,
  getSocietyNightMe,
  listSocietyNightRequests,
  societyNightGoogleLogin,
} from "../controllers/societyNightPassController.js";
import { protectSocietyNightStudent } from "../middleware/societyNightAuthMiddleware.js";

const router = express.Router();

router.post("/google-login", societyNightGoogleLogin);
router.get("/me", protectSocietyNightStudent, getSocietyNightMe);
router.get("/requests", protectSocietyNightStudent, listSocietyNightRequests);
router.post("/requests", protectSocietyNightStudent, createSocietyNightRequest);

export default router;
