import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { auditAction } from "../middleware/logMiddleware.js";
import {
    createExtensionRequest,
    getAllExtensionRequests,
    approveExtensionRequest,
    rejectExtensionRequest
} from "../controllers/extensionController.js";

const router = express.Router();

router.post("/", protect, auditAction("EXTENSION_REQUESTED", "createExtensionRequest", "GUEST_ROOM", (req) => ({ entityType: "BOOKING", entityId: req.body?.bookingId, bookingId: req.body?.bookingId, remarks: req.body?.remarks })), createExtensionRequest);
router.get("/", protect, getAllExtensionRequests);
router.put("/:id/approve", protect, authorizeRoles("admin", "adosa", "co_warden"), auditAction("EXTENSION_APPROVED", "approveExtensionRequest", "GUEST_ROOM", (req) => ({ entityType: "EXTENSION_REQUEST", entityId: req.params.id })), approveExtensionRequest);
router.put("/:id/reject", protect, authorizeRoles("admin", "adosa", "co_warden"), auditAction("EXTENSION_REJECTED", "rejectExtensionRequest", "GUEST_ROOM", (req) => ({ entityType: "EXTENSION_REQUEST", entityId: req.params.id, remarks: req.body?.reason })), rejectExtensionRequest);

export default router;
