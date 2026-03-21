// routes/uploadRoutes.js
import express from "express";
import {
  uploadImageToImageKit,
  deleteImageFromImageKit,
  getImageKitAuthParams,
} from "../controllers/imagekitController.js";

const router = express.Router();

// Public route for uploading images
router.post("/imagekit", uploadImageToImageKit);

// Get ImageKit auth params (for client-side upload)
router.get("/imagekit/auth", getImageKitAuthParams);

// Delete image (protected - optional)
router.delete("/imagekit", deleteImageFromImageKit);

export default router;
