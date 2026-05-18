// src/pages/SocietyBudgetPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Wallet,
  ArrowLeft,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader,
  FileText,
  Image as ImageIcon,
  Edit3,
  Trash2,
} from "lucide-react";
import { IKContext, IKUpload } from "imagekitio-react";
import {
  BACKEND_URL,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
} from "../utils/apiConfig";

const API = BACKEND_URL;

// ─── ImageKit authenticator ──────────────────────────────────────────────────
const authenticator = async () => {
  const r = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET", credentials: "include" });
  if (!r.ok) throw new Error(`Auth failed ${r.status}`);
  return r.json();
};

// ─── Auth headers helper ─────────────────────────────────────────────────────
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, theme }) {
  const colorMap = {
    blue:   { bg: theme === "dark" ? "bg-blue-900/30"  : "bg-blue-50",   text: theme === "dark" ? "text-blue-300"  : "text-blue-700",  icon: "text-blue-500" },
    green:  { bg: theme === "dark" ? "bg-green-900/30" : "bg-green-50",  text: theme === "dark" ? "text-green-300" : "text-green-700", icon: "text-green-500" },
    red:    { bg: theme === "dark" ? "bg-red-900/30"   : "bg-red-50",    text: theme === "dark" ? "text-red-300"   : "text-red-700",   icon: "text-red-500" },
    purple: { bg: theme === "dark" ? "bg-purple-900/30": "bg-purple-50", text: theme === "dark" ? "text-purple-300": "text-purple-700",icon: "text-purple-500" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`rounded-xl p-5 border ${c.bg} ${theme === "dark" ? "border-white/10" : "border-gray-100"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
        <span className={c.icon}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>₹{Number(value || 0).toLocaleString("en-IN")}</p>
    </div>
  );
}

// ─── Attachment preview ───────────────────────────────────────────────────────
function AttachmentPreview({ url, type }) {
  if (type === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition">
        <img src={url} alt="attachment" className="w-full h-full object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs text-blue-600 hover:bg-blue-50 transition">
      <FileText size={14} />PDF
    </a>
  );
}

// ─── Society List View ────────────────────────────────────────────────────────
function SocietyListView({ budgets, loading, theme, onSelect, searchQuery, setSearchQuery, isAdmin, onEditSociety, onDeleteSociety }) {
  const filtered = budgets.filter(b =>
    b.societyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAllocated = budgets.reduce((s, b) => s + (b.totalAllocated || 0), 0);
  const totalSpent     = budgets.reduce((s, b) => s + (b.totalSpent || 0), 0);
  const totalBalance   = totalAllocated - totalSpent;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Allocated" value={totalAllocated} icon={<IndianRupee size={18} />} color="blue"   theme={theme} />
        <StatCard label="Total Spent"     value={totalSpent}     icon={<TrendingDown size={18} />} color="red"    theme={theme} />
        <StatCard label="Total Balance"   value={totalBalance}   icon={<TrendingUp size={18} />}  color="green"  theme={theme} />
      </div>

      {/* Search */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
        theme === "dark" ? "bg-[#3c4043] border-[#5f6368]" : "bg-white border-gray-200"
      }`}>
        <Search size={16} className={theme === "dark" ? "text-gray-400" : "text-gray-400"} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search society…"
          className={`flex-1 bg-transparent text-sm outline-none ${
            theme === "dark" ? "text-gray-100 placeholder-gray-500" : "text-gray-700 placeholder-gray-400"
          }`}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="animate-spin text-blue-500" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Wallet size={40} className={`mx-auto mb-3 ${theme === "dark" ? "text-gray-600" : "text-gray-300"}`} />
          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            {searchQuery ? "No matching societies found" : "No budgets yet. Societies will appear here once a budget is allocated."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(budget => {
            const balance = (budget.totalAllocated || 0) - (budget.totalSpent || 0);
            const pct     = budget.totalAllocated > 0
              ? Math.min(100, ((budget.totalSpent / budget.totalAllocated) * 100)).toFixed(0)
              : 0;
            return (
              <motion.div
                key={budget.societyId}
                whileHover={{ y: -2 }}
                onClick={() => onSelect(budget)}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  theme === "dark"
                    ? "bg-[#292a2d] border-[#3c4043] hover:border-blue-600"
                    : "bg-white border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className={`font-semibold text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
                      {budget.societyName}
                    </h3>
                    <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                      ID: {budget.societyId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      balance <= 0
                        ? "bg-red-100 text-red-700"
                        : balance < budget.totalAllocated * 0.2
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      ₹{Number(balance).toLocaleString("en-IN")} left
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditSociety(budget);
                          }}
                          className={`p-1.5 rounded-lg transition ${theme === "dark" ? "hover:bg-[#3c4043] text-blue-300" : "hover:bg-blue-50 text-blue-600"}`}
                          title="Edit society"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteSociety(budget);
                          }}
                          className={`p-1.5 rounded-lg transition ${theme === "dark" ? "hover:bg-[#3c4043] text-red-300" : "hover:bg-red-50 text-red-600"}`}
                          title="Delete society"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className={`h-2 rounded-full mb-3 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
                  <div
                    className={`h-2 rounded-full transition-all ${
                      pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs">
                  <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                    Allocated: <strong>₹{Number(budget.totalAllocated || 0).toLocaleString("en-IN")}</strong>
                  </span>
                  <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                    Spent: <strong>₹{Number(budget.totalSpent || 0).toLocaleString("en-IN")}</strong>
                  </span>
                  <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>{pct}% used</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Society Detail View ──────────────────────────────────────────────────────
function SocietyDetailView({ budget, expenses, theme, isAdmin, onAddBudget, onAddExpense, onEditExpense, onDeleteExpense, loading }) {
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const balance = (budget.totalAllocated || 0) - (budget.totalSpent || 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Allocated" value={budget.totalAllocated} icon={<IndianRupee size={18} />} color="blue"  theme={theme} />
        <StatCard label="Spent"     value={budget.totalSpent}     icon={<TrendingDown size={18} />} color="red"   theme={theme} />
        <StatCard label="Balance"   value={balance}               icon={<TrendingUp size={18} />}  color="green" theme={theme} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {isAdmin && (
          <button
            onClick={() => setShowBudgetForm(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              theme === "dark"
                ? "bg-blue-700 hover:bg-blue-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <PlusCircle size={16} />
            Allocate Budget
            {showBudgetForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
        <button
          onClick={() => setShowExpenseForm(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            theme === "dark"
              ? "bg-[#3c4043] hover:bg-[#5f6368] text-gray-100"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          <Receipt size={16} />
          Add Expense
          {showExpenseForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Allocate Budget Form */}
      <AnimatePresence>
        {showBudgetForm && isAdmin && (
          <BudgetAllocateForm
            theme={theme}
            onSubmit={async (data) => {
              await onAddBudget(data);
              setShowBudgetForm(false);
            }}
            onClose={() => setShowBudgetForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Add Expense Form */}
      <AnimatePresence>
        {showExpenseForm && (
          <ExpenseForm
            theme={theme}
            balance={balance}
            onSubmit={async (data) => {
              await onAddExpense(data);
              setShowExpenseForm(false);
            }}
            onClose={() => setShowExpenseForm(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingExpense && (
          <ExpenseForm
            theme={theme}
            balance={balance + Number(editingExpense.amount || 0)}
            initialData={editingExpense}
            title="Edit Expense"
            submitLabel="Update Expense"
            onSubmit={async (data) => {
              await onEditExpense(editingExpense._id, data);
              setEditingExpense(null);
            }}
            onClose={() => setEditingExpense(null)}
          />
        )}
      </AnimatePresence>

      {/* Expenses list */}
      <div>
        <h3 className={`text-base font-semibold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
          Expense History ({expenses.length})
        </h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader className="animate-spin text-blue-500" size={24} /></div>
        ) : expenses.length === 0 ? (
          <div className={`py-12 text-center rounded-xl border ${
            theme === "dark" ? "border-[#3c4043] bg-[#292a2d]" : "border-gray-100 bg-gray-50"
          }`}>
            <Receipt size={32} className={`mx-auto mb-2 ${theme === "dark" ? "text-gray-600" : "text-gray-300"}`} />
            <p className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>No expenses yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map(exp => (
              <motion.div
                key={exp._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${
                  theme === "dark"
                    ? "bg-[#292a2d] border-[#3c4043]"
                    : "bg-white border-gray-100 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
                      {exp.description}
                    </p>
                    <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                      By {exp.spentByName || "—"} · {exp.spentByRole || "—"} ·{" "}
                      {new Date(exp.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold text-sm whitespace-nowrap">
                      −₹{Number(exp.amount).toLocaleString("en-IN")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingExpense(exp)}
                      className={`p-1.5 rounded-lg transition ${theme === "dark" ? "hover:bg-[#3c4043] text-blue-300" : "hover:bg-blue-50 text-blue-600"}`}
                      title="Edit expense"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp)}
                      className={`p-1.5 rounded-lg transition ${theme === "dark" ? "hover:bg-[#3c4043] text-red-300" : "hover:bg-red-50 text-red-600"}`}
                      title="Delete expense"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* Attachments */}
                {exp.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {exp.attachments.map((att, i) => (
                      <AttachmentPreview key={i} url={att.url} type={att.type} />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Budget Allocate Form ─────────────────────────────────────────────────────
function BudgetAllocateForm({ theme, onSubmit, onClose }) {
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    try {
      await onSubmit({ amount: Number(amount), remark });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-5 rounded-xl border ${
        theme === "dark" ? "bg-[#3c4043] border-[#5f6368]" : "bg-blue-50 border-blue-200"
      }`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className={`font-semibold text-sm ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
          Allocate Budget
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Amount (₹) *
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              required
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${
                theme === "dark"
                  ? "bg-[#292a2d] border-[#5f6368] text-gray-100"
                  : "bg-white border-blue-200 text-gray-800"
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Remark
            </label>
            <input
              type="text"
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Optional remark"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${
                theme === "dark"
                  ? "bg-[#292a2d] border-[#5f6368] text-gray-100"
                  : "bg-white border-blue-200 text-gray-800"
              }`}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Allocating…" : "Allocate"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ─── Expense Form with ImageKit Upload ───────────────────────────────────────
function ExpenseForm({ theme, balance, onSubmit, onClose, initialData = null, title = "Add Expense", submitLabel = "Save Expense" }) {
  const [description, setDescription] = useState(initialData?.description || "");
  const [amount, setAmount]     = useState(initialData?.amount ? String(initialData.amount) : "");
  const [attachments, setAttachments] = useState(Array.isArray(initialData?.attachments) ? initialData.attachments : []); // [{url, type}]
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleIKSuccess = (res) => {
    const url = res?.url;
    if (!url) return;
    const ext = url.split(".").pop().toLowerCase();
    const type = ["jpg","jpeg","png","webp","gif"].includes(ext) ? "image" : "pdf";
    setAttachments(prev => [...prev, { url, type }]);
    setUploading(false);
    setUploadErr("");
  };

  const handleIKError = (err) => {
    setUploading(false);
    setUploadErr(err?.message || "Upload failed");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!description.trim()) return setError("Description is required");
    if (!amount || Number(amount) <= 0) return setError("Amount must be > 0");
    if (Number(amount) > balance) return setError(`Insufficient balance (₹${balance.toLocaleString("en-IN")} available)`);
    if (attachments.length === 0) return setError("At least one attachment is required");

    setLoading(true);
    try {
      await onSubmit({ description: description.trim(), amount: Number(amount), attachments });
    } catch (err) {
      setError(err.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-5 rounded-xl border ${
        theme === "dark" ? "bg-[#3c4043] border-[#5f6368]" : "bg-gray-50 border-gray-200"
      }`}
    >
      <IKContext
        publicKey={IMAGEKIT_PUBLIC_KEY}
        urlEndpoint={IMAGEKIT_URL_ENDPOINT}
        authenticator={authenticator}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <h4 className={`font-semibold text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
            {title}
          </h4>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={14} />{error}
            </div>
          )}

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Description *
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Event banners and posters"
              required
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${
                theme === "dark"
                  ? "bg-[#292a2d] border-[#5f6368] text-gray-100"
                  : "bg-white border-gray-200 text-gray-800"
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Amount (₹) * <span className={`font-normal ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>(Available: ₹{balance.toLocaleString("en-IN")})</span>
            </label>
            <input
              type="number"
              min="1"
              max={balance}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 2000"
              required
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${
                theme === "dark"
                  ? "bg-[#292a2d] border-[#5f6368] text-gray-100"
                  : "bg-white border-gray-200 text-gray-800"
              }`}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Attachments * (1–5 files, images or PDF)
            </label>
            {attachments.length < 5 && (
              <div className={`relative rounded-lg border-2 border-dashed p-4 text-center transition ${
                theme === "dark" ? "border-[#5f6368] hover:border-blue-500" : "border-gray-200 hover:border-blue-400"
              }`}>
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
                    <Loader className="animate-spin" size={16} /> Uploading…
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1">
                    <Upload size={20} className={theme === "dark" ? "text-gray-400" : "text-gray-400"} />
                    <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Click to upload
                    </span>
                    <IKUpload
                      folder="/society-budgets"
                      useUniqueFileName
                      isPrivateFile={false}
                      onUploadStart={() => { setUploading(true); setUploadErr(""); }}
                      onSuccess={handleIKSuccess}
                      onError={handleIKError}
                      validateFile={(f) => {
                        if (!["image/jpeg","image/jpg","image/png","image/webp","image/gif","application/pdf"].includes(f.type)) {
                          setUploadErr("Only images and PDFs allowed");
                          return false;
                        }
                        if (f.size > 5 * 1024 * 1024) {
                          setUploadErr("Max 5MB per file");
                          return false;
                        }
                        return true;
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
            {uploadErr && <p className="text-xs text-red-500 mt-1">{uploadErr}</p>}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group">
                    <AttachmentPreview url={att.url} type={att.type} />
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </IKContext>
    </motion.div>
  );
}

// ─── Add Society Modal ────────────────────────────────────────────────────────
function AddSocietyModal({ theme, onClose, onCreated, societySuggestions }) {
  const [societyId, setSocietyId] = useState("");
  const [societyName, setSocietyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = societySuggestions.filter(s =>
    s.toLowerCase().includes(societyName.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!societyName.trim()) return;
    const id = societyId.trim() || societyName.trim().toLowerCase().replace(/\s+/g, "-");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/societies/${encodeURIComponent(id)}/budget?name=${encodeURIComponent(societyName.trim())}`, {
        method: "GET",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      await onCreated(id);
      onClose();
    } catch (err) {
      // budget already created lazily
      await onCreated(id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
          theme === "dark" ? "bg-[#292a2d]" : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
            Open Society Budget
          </h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${theme === "dark" ? "hover:bg-[#3c4043] text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Society Name *
            </label>
            <input
              type="text"
              value={societyName}
              onChange={e => { setSocietyName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. Creative Computing Society"
              required
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${
                theme === "dark"
                  ? "bg-[#3c4043] border-[#5f6368] text-gray-100"
                  : "bg-white border-gray-200 text-gray-800"
              }`}
            />
            {showSuggestions && filtered.length > 0 && (
              <div className={`absolute z-10 top-full mt-1 w-full rounded-lg border shadow-lg max-h-40 overflow-y-auto ${
                theme === "dark" ? "bg-[#3c4043] border-[#5f6368]" : "bg-white border-gray-200"
              }`}>
                {filtered.slice(0, 8).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSocietyName(s); setSocietyId(s.toLowerCase().replace(/\s+/g, "-")); setShowSuggestions(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition ${
                      theme === "dark" ? "hover:bg-[#5f6368] text-gray-200" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Society ID (auto-generated if blank)
            </label>
            <input
              type="text"
              value={societyId}
              onChange={e => setSocietyId(e.target.value)}
              placeholder="e.g. ccs-tiet"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${
                theme === "dark"
                  ? "bg-[#3c4043] border-[#5f6368] text-gray-100"
                  : "bg-white border-gray-200 text-gray-800"
              }`}
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-100 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Opening…" : "Open Budget"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function EditSocietyModal({ theme, budget, onClose, onSubmit }) {
  const [societyName, setSocietyName] = useState(budget?.societyName || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!societyName.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ societyName: societyName.trim() });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
            Edit Society
          </h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${theme === "dark" ? "hover:bg-[#3c4043] text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Society Name *
            </label>
            <input
              type="text"
              value={societyName}
              onChange={e => setSocietyName(e.target.value)}
              required
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${
                theme === "dark"
                  ? "bg-[#3c4043] border-[#5f6368] text-gray-100"
                  : "bg-white border-gray-200 text-gray-800"
              }`}
            />
            <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
              Society ID remains unchanged: {budget?.societyId}
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-100 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SocietyBudgetPage({ theme = "dark", currentUser }) {
  const [budgets, setBudgets]       = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [expenses, setExpenses]     = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSociety, setEditingSociety] = useState(null);
  const [societySuggestions, setSocietySuggestions] = useState([]);
  const [toast, setToast] = useState(null);

  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = ["admin", "adosa"].includes(role);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all budgets
  const fetchBudgets = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API}/api/societies/budgets`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load budgets");
      const data = await res.json();
      setBudgets(data.budgets || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Fetch society suggestions
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/venue/enquiry/society-suggestions?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setSocietySuggestions(data.suggestions || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchBudgets();
    fetchSuggestions();
  }, [fetchBudgets, fetchSuggestions]);

  // Select a society and load its expenses
  const handleSelectSociety = useCallback(async (budget) => {
    setSelectedBudget(budget);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/societies/${encodeURIComponent(budget.societyId)}/expenses`, {
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (err) {
      showToast("Failed to load expenses", "error");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Allocate budget
  const handleAddBudget = useCallback(async ({ amount, remark }) => {
    try {
      const res = await fetch(`${API}/api/societies/${encodeURIComponent(selectedBudget.societyId)}/budget/add`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ amount, remark, societyName: selectedBudget.societyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      showToast(`₹${amount.toLocaleString("en-IN")} allocated successfully`);
      setSelectedBudget(data.budget);
      // Refresh list
      fetchBudgets();
    } catch (err) {
      showToast(err.message, "error");
      throw err;
    }
  }, [selectedBudget, fetchBudgets]);

  // Add expense
  const handleAddExpense = useCallback(async ({ description, amount, attachments }) => {
    try {
      const res = await fetch(`${API}/api/societies/${encodeURIComponent(selectedBudget.societyId)}/expenses`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ description, amount, attachments, societyName: selectedBudget.societyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      showToast("Expense recorded successfully");
      setSelectedBudget(data.budget);
      setExpenses(prev => [data.expense, ...prev]);
      fetchBudgets();
    } catch (err) {
      showToast(err.message, "error");
      throw err;
    }
  }, [selectedBudget, fetchBudgets]);

  const handleEditSociety = useCallback(async (budget, { societyName }) => {
    try {
      const res = await fetch(`${API}/api/societies/${encodeURIComponent(budget.societyId)}/budget`, {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ societyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      showToast("Society updated successfully");
      setBudgets(prev => prev.map(item => item.societyId === budget.societyId ? data.budget : item));
      if (selectedBudget?.societyId === budget.societyId) setSelectedBudget(data.budget);
      fetchBudgets();
    } catch (err) {
      showToast(err.message, "error");
      throw err;
    }
  }, [fetchBudgets, selectedBudget]);

  const handleDeleteSociety = useCallback(async (budget) => {
    if (!window.confirm(`Delete "${budget.societyName}" and all its expenses? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/api/societies/${encodeURIComponent(budget.societyId)}/budget`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      showToast("Society deleted successfully");
      setBudgets(prev => prev.filter(item => item.societyId !== budget.societyId));
      if (selectedBudget?.societyId === budget.societyId) {
        setSelectedBudget(null);
        setExpenses([]);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [selectedBudget]);

  const handleEditExpense = useCallback(async (expenseId, { description, amount, attachments }) => {
    try {
      const res = await fetch(`${API}/api/societies/expenses/${encodeURIComponent(expenseId)}`, {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ description, amount, attachments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      showToast("Expense updated successfully");
      setSelectedBudget(data.budget);
      setExpenses(prev => prev.map(exp => exp._id === expenseId ? data.expense : exp));
      fetchBudgets();
    } catch (err) {
      showToast(err.message, "error");
      throw err;
    }
  }, [fetchBudgets]);

  const handleDeleteExpense = useCallback(async (expense) => {
    if (!window.confirm(`Delete this expense of ₹${Number(expense.amount || 0).toLocaleString("en-IN")}?`)) return;
    try {
      const res = await fetch(`${API}/api/societies/expenses/${encodeURIComponent(expense._id)}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      showToast("Expense deleted successfully");
      setSelectedBudget(data.budget);
      setExpenses(prev => prev.filter(exp => exp._id !== expense._id));
      fetchBudgets();
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [fetchBudgets]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {selectedBudget && (
            <button
              onClick={() => setSelectedBudget(null)}
              className={`p-2 rounded-lg transition ${
                theme === "dark" ? "hover:bg-[#3c4043] text-gray-400" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${
              theme === "dark" ? "text-gray-100" : "text-gray-800"
            }`}>
              <Wallet size={24} className="text-blue-500" />
              {selectedBudget ? selectedBudget.societyName : "Society Budgets"}
            </h1>
            {selectedBudget && (
              <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                ID: {selectedBudget.societyId}
              </p>
            )}
          </div>
        </div>

        {!selectedBudget && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all"
          >
            <PlusCircle size={16} />
            New Society
          </button>
        )}
      </div>

      {/* Content */}
      {selectedBudget ? (
        <SocietyDetailView
          budget={selectedBudget}
          expenses={expenses}
          theme={theme}
          isAdmin={isAdmin}
          onAddBudget={handleAddBudget}
          onAddExpense={handleAddExpense}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
          loading={loadingDetail}
        />
      ) : (
        <SocietyListView
          budgets={budgets}
          loading={loadingList}
          theme={theme}
          onSelect={handleSelectSociety}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isAdmin={isAdmin}
          onEditSociety={setEditingSociety}
          onDeleteSociety={handleDeleteSociety}
        />
      )}

      {/* Add Society Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddSocietyModal
            theme={theme}
            onClose={() => setShowAddModal(false)}
            onCreated={async (id) => {
              await fetchBudgets();
              // Auto-select newly created society
              const newBudget = { societyId: id, societyName: id, totalAllocated: 0, totalSpent: 0 };
              await handleSelectSociety(newBudget);
            }}
            societySuggestions={societySuggestions}
          />
        )}
        {editingSociety && (
          <EditSocietyModal
            theme={theme}
            budget={editingSociety}
            onClose={() => setEditingSociety(null)}
            onSubmit={(payload) => handleEditSociety(editingSociety, payload)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium z-50 ${
              toast.type === "error" ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
