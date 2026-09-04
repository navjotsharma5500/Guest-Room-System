import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { auditAction } from "../middleware/logMiddleware.js";
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
router.put("/settings", auditAction("CLEANING_SETTINGS_UPDATED", "updateCleaningSettings", "GUEST_ROOM"), updateCleaningSettings);
router.get("/checklist-items", getChecklistItems);
router.post("/checklist-items", auditAction("CLEANING_CHECKLIST_ITEM_ADDED", "addChecklistItem", "GUEST_ROOM"), addChecklistItem);
router.delete("/checklist-items/:id", auditAction("CLEANING_CHECKLIST_ITEM_DELETED", "deleteChecklistItem", "GUEST_ROOM", (req) => ({ entityType: "CLEANING_CHECKLIST_ITEM", entityId: req.params.id })), deleteChecklistItem);
router.get("/rooms/:hostel/:roomNo", getRoomCleaningStatus);
const roomFields = (req) => ({ entityType: "ROOM", entityId: `${req.params.hostel}/${req.params.roomNo}`, hostel: req.params.hostel, roomNo: req.params.roomNo });
router.post("/rooms/:hostel/:roomNo/checklist", auditAction("CLEANING_CHECKLIST_SUBMITTED", "submitCleaningChecklist", "GUEST_ROOM", roomFields), submitCleaningChecklist);
router.post("/rooms/:hostel/:roomNo/mark-clean", auditAction("ROOM_MARKED_CLEAN", "markRoomClean", "GUEST_ROOM", roomFields), markRoomClean);

export default router;
