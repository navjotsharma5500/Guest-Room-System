// controllers/societyBudgetController.js
import { SocietyBudget, SocietyExpense, SocietyBudgetLog } from "../models/SocietyBudget.js";

const BUDGET_ADMIN_ROLES  = ["admin", "adosa"];
const BUDGET_ACCESS_ROLES = ["admin", "adosa", "assistant"];

// ─── Helper: check roles ───────────────────────────────────────────────────────
const requireRole = (user, roles) => roles.includes((user.role || "").toLowerCase());

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/societies/budgets  — list all society budgets
// Access: admin, adosa, assistant
// ─────────────────────────────────────────────────────────────────────────────
export const getAllBudgets = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ACCESS_ROLES))
      return res.status(403).json({ message: "Access denied" });

    const budgets = await SocietyBudget.find().sort({ societyName: 1 });
    return res.json({ success: true, budgets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/societies/:id/budget  — single society budget detail
// ─────────────────────────────────────────────────────────────────────────────
export const getBudgetBySociety = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ACCESS_ROLES))
      return res.status(403).json({ message: "Access denied" });

    let budget = await SocietyBudget.findOne({ societyId: req.params.id });

    // Auto-create if doesn't exist (lazy init)
    if (!budget) {
      budget = await SocietyBudget.create({
        societyId:   req.params.id,
        societyName: req.query.name || req.params.id,
        createdBy:   req.user._id,
        updatedBy:   req.user._id,
      });
    }

    const expenses = await SocietyExpense.find({ societyId: req.params.id })
      .sort({ createdAt: -1 });

    return res.json({ success: true, budget, expenses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/societies/:id/budget/add  — allocate budget
// Access: admin, adosa only
// ─────────────────────────────────────────────────────────────────────────────
export const addBudget = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ADMIN_ROLES))
      return res.status(403).json({ message: "Only admin or ADOSA can allocate budget" });

    const { amount, remark, societyName } = req.body;
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ message: "Amount must be greater than 0" });

    let budget = await SocietyBudget.findOne({ societyId: req.params.id });
    if (!budget) {
      budget = new SocietyBudget({
        societyId:   req.params.id,
        societyName: societyName || req.params.id,
        createdBy:   req.user._id,
      });
    }

    budget.totalAllocated += Number(amount);
    budget.updatedBy = req.user._id;
    await budget.save();

    // Audit log
    await SocietyBudgetLog.create({
      societyId:      req.params.id,
      action:         "ADD_BUDGET",
      amount:         Number(amount),
      performedBy:    req.user._id,
      performedByName: req.user.name,
      remark,
    });

    return res.json({
      success: true,
      message: `₹${amount} allocated to ${budget.societyName}`,
      budget,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/societies/:id/expenses  — add an expense
// Access: admin, adosa, assistant
// ─────────────────────────────────────────────────────────────────────────────
export const addExpense = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ACCESS_ROLES))
      return res.status(403).json({ message: "Access denied" });

    const { description, amount, attachments, societyName } = req.body;

    if (!description?.trim())
      return res.status(400).json({ message: "Description is required" });
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ message: "Amount must be > 0" });
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0)
      return res.status(400).json({ message: "At least one attachment is required" });
    if (attachments.length > 5)
      return res.status(400).json({ message: "Maximum 5 attachments allowed" });

    // Ensure budget exists
    let budget = await SocietyBudget.findOne({ societyId: req.params.id });
    if (!budget) {
      budget = new SocietyBudget({
        societyId:   req.params.id,
        societyName: societyName || req.params.id,
        createdBy:   req.user._id,
      });
      await budget.save();
    }

    // Validate funds
    const balance = budget.totalAllocated - budget.totalSpent;
    if (Number(amount) > balance)
      return res.status(400).json({
        message: `Insufficient balance. Available: ₹${balance}, Requested: ₹${amount}`,
      });

    // Create expense (immutable)
    const expense = await SocietyExpense.create({
      societyId:   req.params.id,
      societyName: budget.societyName,
      description: description.trim(),
      amount:      Number(amount),
      attachments,
      spentBy:     req.user._id,
      spentByName: req.user.name,
      spentByRole: req.user.role,
    });

    // Update budget totals
    budget.totalSpent += Number(amount);
    budget.updatedBy = req.user._id;
    await budget.save();

    // Audit log
    await SocietyBudgetLog.create({
      societyId:      req.params.id,
      action:         "ADD_EXPENSE",
      amount:         Number(amount),
      referenceId:    expense._id,
      performedBy:    req.user._id,
      performedByName: req.user.name,
    });

    return res.json({ success: true, message: "Expense recorded", expense, budget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSocietyBudget = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ADMIN_ROLES))
      return res.status(403).json({ message: "Only admin or ADOSA can edit society budgets" });

    const { societyName } = req.body;
    if (!societyName?.trim())
      return res.status(400).json({ message: "Society name is required" });

    const budget = await SocietyBudget.findOne({ societyId: req.params.id });
    if (!budget) return res.status(404).json({ message: "Society budget not found" });

    const oldName = budget.societyName;
    budget.societyName = societyName.trim();
    budget.updatedBy = req.user._id;
    await budget.save();

    await SocietyExpense.updateMany(
      { societyId: req.params.id },
      { $set: { societyName: budget.societyName } }
    );

    await SocietyBudgetLog.create({
      societyId: req.params.id,
      action: "EDIT_SOCIETY",
      amount: 0,
      performedBy: req.user._id,
      performedByName: req.user.name,
      remark: `Society renamed from "${oldName}" to "${budget.societyName}"`,
    });

    return res.json({ success: true, message: "Society updated", budget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteSocietyBudget = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ADMIN_ROLES))
      return res.status(403).json({ message: "Only admin or ADOSA can delete society budgets" });

    const budget = await SocietyBudget.findOne({ societyId: req.params.id });
    if (!budget) return res.status(404).json({ message: "Society budget not found" });

    await SocietyBudgetLog.create({
      societyId: req.params.id,
      action: "DELETE_SOCIETY",
      amount: Number(budget.totalAllocated || 0),
      performedBy: req.user._id,
      performedByName: req.user.name,
      remark: `Deleted society budget "${budget.societyName}" with spent ₹${Number(budget.totalSpent || 0)}`,
    });

    await SocietyExpense.deleteMany({ societyId: req.params.id });
    await SocietyBudget.deleteOne({ societyId: req.params.id });

    return res.json({ success: true, message: "Society budget deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ACCESS_ROLES))
      return res.status(403).json({ message: "Access denied" });

    const { description, amount, attachments } = req.body;
    if (!description?.trim())
      return res.status(400).json({ message: "Description is required" });
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ message: "Amount must be > 0" });
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0)
      return res.status(400).json({ message: "At least one attachment is required" });
    if (attachments.length > 5)
      return res.status(400).json({ message: "Maximum 5 attachments allowed" });

    const expense = await SocietyExpense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    const budget = await SocietyBudget.findOne({ societyId: expense.societyId });
    if (!budget) return res.status(404).json({ message: "Society budget not found" });

    const oldAmount = Number(expense.amount || 0);
    const newAmount = Number(amount);
    const diff = newAmount - oldAmount;
    const availableAfterRemovingOld = Number(budget.totalAllocated || 0) - (Number(budget.totalSpent || 0) - oldAmount);
    if (newAmount > availableAfterRemovingOld) {
      return res.status(400).json({
        message: `Insufficient balance. Available after this edit: ₹${availableAfterRemovingOld}, Requested: ₹${newAmount}`,
      });
    }

    expense.description = description.trim();
    expense.amount = newAmount;
    expense.attachments = attachments;
    await expense.save();

    budget.totalSpent = Math.max(0, Number(budget.totalSpent || 0) + diff);
    budget.updatedBy = req.user._id;
    await budget.save();

    await SocietyBudgetLog.create({
      societyId: expense.societyId,
      action: "EDIT_EXPENSE",
      amount: diff,
      referenceId: expense._id,
      performedBy: req.user._id,
      performedByName: req.user.name,
      remark: `Expense edited. Old amount ₹${oldAmount}, new amount ₹${newAmount}`,
    });

    return res.json({ success: true, message: "Expense updated", expense, budget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ACCESS_ROLES))
      return res.status(403).json({ message: "Access denied" });

    const expense = await SocietyExpense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    const budget = await SocietyBudget.findOne({ societyId: expense.societyId });
    if (!budget) return res.status(404).json({ message: "Society budget not found" });

    const oldAmount = Number(expense.amount || 0);
    budget.totalSpent = Math.max(0, Number(budget.totalSpent || 0) - oldAmount);
    budget.updatedBy = req.user._id;
    await budget.save();

    await SocietyBudgetLog.create({
      societyId: expense.societyId,
      action: "DELETE_EXPENSE",
      amount: oldAmount,
      referenceId: expense._id,
      performedBy: req.user._id,
      performedByName: req.user.name,
      remark: `Deleted expense "${expense.description}"`,
    });

    await SocietyExpense.deleteOne({ _id: expense._id });

    return res.json({ success: true, message: "Expense deleted", budget, expenseId: req.params.expenseId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/societies/:id/expenses  — list expenses for a society
// ─────────────────────────────────────────────────────────────────────────────
export const getExpenses = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ACCESS_ROLES))
      return res.status(403).json({ message: "Access denied" });

    const expenses = await SocietyExpense.find({ societyId: req.params.id })
      .sort({ createdAt: -1 });
    return res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses/:expenseId  — single expense detail
// ─────────────────────────────────────────────────────────────────────────────
export const getExpenseById = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ACCESS_ROLES))
      return res.status(403).json({ message: "Access denied" });

    const expense = await SocietyExpense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    return res.json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/societies/:id/budget/logs  — audit log for a society
// ─────────────────────────────────────────────────────────────────────────────
export const getBudgetLogs = async (req, res) => {
  try {
    if (!requireRole(req.user, BUDGET_ADMIN_ROLES))
      return res.status(403).json({ message: "Access denied" });

    const logs = await SocietyBudgetLog.find({ societyId: req.params.id })
      .sort({ createdAt: -1 });
    return res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
