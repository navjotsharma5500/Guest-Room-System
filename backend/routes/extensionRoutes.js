import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
    createExtensionRequest,
    getAllExtensionRequests,
    approveExtensionRequest,
    rejectExtensionRequest
} from "../controllers/extensionController.js";

const router = express.Router();

router.post("/", protect, createExtensionRequest);
router.get("/", protect, getAllExtensionRequests);
router.put("/:id/approve", protect, authorizeRoles("admin", "adosa", "co_warden"), approveExtensionRequest);
router.put("/:id/reject", protect, authorizeRoles("admin", "adosa", "co_warden"), rejectExtensionRequest);

export default router;
