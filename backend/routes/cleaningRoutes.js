import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addChecklistItem,
  deleteChecklistItem,
  getChecklistItems,
  getCleaningSettings,
  getRoomCleaningStatus,
  markRoomClean,
  submitCleaningChecklist,
  updateCleaningSettings,
} from "../controllers/cleaningController.js";

const router = express.Router();

router.use(protect);

router.get("/settings", getCleaningSettings);
router.put("/settings", updateCleaningSettings);
router.get("/checklist-items", getChecklistItems);
router.post("/checklist-items", addChecklistItem);
router.delete("/checklist-items/:id", deleteChecklistItem);
router.get("/rooms/:hostel/:roomNo", getRoomCleaningStatus);
router.post("/rooms/:hostel/:roomNo/checklist", submitCleaningChecklist);
router.post("/rooms/:hostel/:roomNo/mark-clean", markRoomClean);

export default router;
