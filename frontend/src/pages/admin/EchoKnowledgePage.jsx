import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2, Search, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../../utils/apiConfig";

const API = BACKEND_URL;

const INITIAL_FORM = {
  question: "",
  answer: "",
  keywordsText: "",
  rolesText: "",
  minScore: "0.35",
  priority: "0",
  isActive: true,
};

const toPayload = (form) => ({
  question: form.question.trim(),
  answer: form.answer.trim(),
  keywords: form.keywordsText
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean),
  roles: form.rolesText
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean),
  minScore: Number(form.minScore || 0.35),
  priority: Number(form.priority || 0),
  isActive: Boolean(form.isActive),
});

export default function EchoKnowledgePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadItems = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError("");
    try {
      const cleaned = String(searchTerm || "").trim();
      const query = cleaned ? `?includeInactive=true&q=${encodeURIComponent(cleaned)}` : "?includeInactive=true";
      const res = await fetch(`${API}/api/ai/knowledge${query}`, {
        method: "GET",
        credentials: "include",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load knowledge entries");
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load knowledge entries");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadItems("");
  }, [loadItems]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId("");
  };

  const onSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = toPayload(form);
      if (!payload.question || !payload.answer) {
        throw new Error("Question and answer are required");
      }
      const isEdit = Boolean(editingId);
      const url = isEdit ? `${API}/api/ai/knowledge/${editingId}` : `${API}/api/ai/knowledge`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save entry");
      resetForm();
      await loadItems(search);
    } catch (err) {
      setError(err.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item) => {
    setEditingId(item._id);
    setForm({
      question: item.question || "",
      answer: item.answer || "",
      keywordsText: Array.isArray(item.keywords) ? item.keywords.join(", ") : "",
      rolesText: Array.isArray(item.roles) ? item.roles.join(", ") : "",
      minScore: String(item.minScore ?? 0.35),
      priority: String(item.priority ?? 0),
      isActive: item.isActive !== false,
    });
  };

  const onDelete = async (id) => {
    setError("");
    try {
      const res = await fetch(`${API}/api/ai/knowledge/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete entry");
      if (editingId === id) resetForm();
      await loadItems(search);
    } catch (err) {
      setError(err.message || "Failed to delete entry");
    }
  };

  const onExportCsv = async () => {
    setError("");
    try {
      const res = await fetch(`${API}/api/ai/knowledge/export`, {
        method: "GET",
        credentials: "include",
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to export CSV");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "echo-knowledge.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to export CSV");
    }
  };

  const onImportCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadHeaders = {};
      if (token) uploadHeaders.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API}/api/ai/knowledge/import`, {
        method: "POST",
        credentials: "include",
        headers: uploadHeaders,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to import CSV");
      await loadItems(search);
    } catch (err) {
      setError(err.message || "Failed to import CSV");
    } finally {
      event.target.value = "";
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Echo Knowledge Base</h1>
            <p className="text-slate-600">Manage local Q&A and keyword matching for chatbot fallback flow</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onExportCsv}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center gap-2 disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              {importing ? "Importing..." : "Import CSV"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onImportCsv}
              className="hidden"
            />
            <button
              onClick={() => navigate("/admin/dashboard-selector")}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 md:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">{editingId ? "Edit Entry" : "New Entry"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Question</label>
                <input
                  value={form.question}
                  onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="Enter question"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Answer</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))}
                  rows={6}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="Enter answer text"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Keywords (comma separated)</label>
                <input
                  value={form.keywordsText}
                  onChange={(e) => setForm((prev) => ({ ...prev, keywordsText: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="extension, approval, adosa2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Roles (optional, comma separated)</label>
                <input
                  value={form.rolesText}
                  onChange={(e) => setForm((prev) => ({ ...prev, rolesText: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  placeholder="admin, manager"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Min Score</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={form.minScore}
                    onChange={(e) => setForm((prev) => ({ ...prev, minScore: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Active
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white flex items-center gap-2 disabled:opacity-60"
                >
                  {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {saving ? "Saving..." : editingId ? "Update Entry" : "Add Entry"}
                </button>
                {editingId ? (
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Knowledge Entries</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-2 py-1.5">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="outline-none text-sm"
                  />
                </div>
                <button
                  onClick={() => loadItems(search)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-white"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-slate-500">Loading entries...</div>
            ) : items.length === 0 ? (
              <div className="text-slate-500">No entries found.</div>
            ) : (
              <div className="space-y-3 max-h-[68vh] overflow-auto pr-1">
                {items.map((item) => (
                  <div key={item._id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.question}</h3>
                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{item.answer}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            score {item.minScore ?? 0.35}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            priority {item.priority ?? 0}
                          </span>
                          <span className={`px-2 py-1 rounded-full ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.isActive ? "active" : "inactive"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Keywords: {(item.keywords || []).join(", ") || "none"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Roles: {(item.roles || []).join(", ") || "all roles"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(item)}
                          className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(item._id)}
                          className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-700 bg-red-50 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
