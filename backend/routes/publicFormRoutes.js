import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  listPublicForms, getPublicForm, listAdminForms, createPublicForm,
  updatePublicForm, setPublicFormStatus, deletePublicForm, reorderPublicForms, incrementFormView,
} from "../controllers/publicFormController.js";
import { downloadPublicForm } from "../services/publicFormDownload.js";

const router = express.Router();
// Admin and Assistant can manage public forms (list/create/edit/enable-disable/reorder);
// delete is further restricted to Admin only below.
router.use("/admin", protect, authorizeRoles("admin", "assistant"), (req, res, next) => {
  if (req.user.isActive === false) return res.status(403).json({ success: false, message: "Account is inactive." });
  return next();
});
router.get("/admin/all", listAdminForms);
router.post("/admin", createPublicForm);
router.patch("/admin/reorder", reorderPublicForms);
router.put("/admin/:id", updatePublicForm);
router.delete("/admin/:id", authorizeRoles("admin"), deletePublicForm);
router.patch("/admin/:id/status", setPublicFormStatus);

router.get("/", listPublicForms);
router.post("/:id/view", incrementFormView);
router.get("/:id/download", downloadPublicForm);
router.get("/:id", getPublicForm);

export default router;
