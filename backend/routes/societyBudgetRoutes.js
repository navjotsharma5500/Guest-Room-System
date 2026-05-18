// routes/societyBudgetRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAllBudgets,
  getBudgetBySociety,
  addBudget,
  addExpense,
  updateExpense,
  deleteExpense,
  updateSocietyBudget,
  deleteSocietyBudget,
  getExpenses,
  getExpenseById,
  getBudgetLogs,
} from "../controllers/societyBudgetController.js";

const router = express.Router();

// All routes require auth
router.use(protect);

// Society budget list
router.get("/budgets",                   getAllBudgets);
router.get("/:id/budget",               getBudgetBySociety);
router.put("/:id/budget",               updateSocietyBudget);
router.delete("/:id/budget",            deleteSocietyBudget);
router.post("/:id/budget/add",          addBudget);
router.get("/:id/budget/logs",          getBudgetLogs);

// Expenses
router.get("/:id/expenses",             getExpenses);
router.post("/:id/expenses",            addExpense);
router.get("/expenses/:expenseId",      getExpenseById);
router.put("/expenses/:expenseId",      updateExpense);
router.delete("/expenses/:expenseId",   deleteExpense);

export default router;
