import express from "express";
import { createHostel, getHostels, getHostel } from "../controllers/hostelController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/create",
  protect,
  authorizeRoles("admin"),
  createHostel
);

router.get("/", protect, getHostels);
router.get("/:id", protect, getHostel);

export default router;
