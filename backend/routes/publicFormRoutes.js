import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  listPublicForms, getPublicForm, listAdminForms, createPublicForm,
  updatePublicForm, setPublicFormStatus, deletePublicForm, reorderPublicForms,
} from "../controllers/publicFormController.js";
import { downloadPublicForm } from "../services/publicFormDownload.js";

const router = express.Router();
router.use("/admin", protect, authorizeRoles("admin"), (req, res, next) => {
  if (req.user.isActive === false) return res.status(403).json({ success: false, message: "Administrator account is inactive." });
  return next();
});
router.get("/admin/all", listAdminForms);
router.post("/admin", createPublicForm);
router.patch("/admin/reorder", reorderPublicForms);
router.put("/admin/:id", updatePublicForm);
router.delete("/admin/:id", deletePublicForm);
router.patch("/admin/:id/status", setPublicFormStatus);

router.get("/", listPublicForms);
router.get("/:id/download", downloadPublicForm);
router.get("/:id", getPublicForm);

export default router;
