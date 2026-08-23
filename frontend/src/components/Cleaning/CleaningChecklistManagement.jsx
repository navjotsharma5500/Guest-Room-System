import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function CleaningChecklistManagement({ showToast = () => {} }) {
  const { currentUser } = useAuth();
  const role = String(currentUser?.role || currentUser?.user?.role || "").toLowerCase();
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel || "";
  const isAdmin = role === "admin";
  const [items, setItems] = useState([]);
  const [itemsError, setItemsError] = useState("");
  // Single source of truth: operations.enableCleaningWorkflow (System Controls
  // → Enterprise Feature Switches → "Enable Cleaning Workflow"). This is NOT a
  // second boolean — toggling it here writes the same canonical setting.
  const [workflowEnabled, setWorkflowEnabled] = useState(true);
  // Independent Guest Support setting: cleaning.enableCleaningRequests.
  const [cleaningRequestsEnabled, setCleaningRequestsEnabled] = useState(true);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState(isAdmin ? "universal" : "hostel");
  const [hostel, setHostel] = useState(assignedHostel);
  const [loading, setLoading] = useState(false);

  // Keep showToast current without making `load` depend on it — the parent
  // (SettingsPage) passes a new showToast function on every render, and
  // depending on it here previously re-triggered the fetch effect on every
  // parent re-render, including the re-renders caused by the fetch's own
  // error toast — producing a request loop against a 403 endpoint.
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const hostelOptions = useMemo(
    () => Array.from(new Set(items.filter((item) => item.hostel).map((item) => item.hostel))).sort(),
    [items]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setItemsError("");

    const [itemsResult, workflowResult, cleaningResult] = await Promise.allSettled([
      fetch("/api/cleaning/checklist-items", { credentials: "include" }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load checklist items");
        return data;
      }),
      fetch("/api/system-settings/public", { credentials: "include" }).then((res) => res.json()),
      fetch("/api/cleaning/settings", { credentials: "include" }).then((res) => res.json()),
    ]);

    if (itemsResult.status === "fulfilled") {
      setItems(itemsResult.value.items || []);
    } else {
      const message = itemsResult.reason?.message || "Failed to load checklist items";
      setItemsError(message);
      showToastRef.current(message, "error");
    }

    if (workflowResult.status === "fulfilled" && workflowResult.value?.success) {
      setWorkflowEnabled(workflowResult.value.settings?.operations?.enableCleaningWorkflow !== false);
    }

    if (cleaningResult.status === "fulfilled" && cleaningResult.value?.success) {
      setCleaningRequestsEnabled(cleaningResult.value.cleaning?.enableCleaningRequests === true);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveWorkflowEnabled = async (checked) => {
    const previous = workflowEnabled;
    setWorkflowEnabled(checked);
    try {
      const res = await fetch("/api/system-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: { enableCleaningWorkflow: checked } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update cleaning workflow");
      showToastRef.current("Cleaning workflow updated", "success");
    } catch (err) {
      setWorkflowEnabled(previous);
      showToastRef.current(err.message, "error");
    }
  };

  const saveCleaningRequestsEnabled = async (checked) => {
    const previous = cleaningRequestsEnabled;
    setCleaningRequestsEnabled(checked);
    try {
      const res = await fetch("/api/cleaning/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableCleaningRequests: checked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update cleaning requests setting");
      showToastRef.current("Cleaning settings updated", "success");
    } catch (err) {
      setCleaningRequestsEnabled(previous);
      showToastRef.current(err.message, "error");
    }
  };

  const addItem = async () => {
    if (!label.trim()) {
      showToastRef.current("Enter checklist item name", "warning");
      return;
    }

    try {
      const res = await fetch("/api/cleaning/checklist-items", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          scope,
          hostel: scope === "hostel" ? hostel || assignedHostel : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add item");
      setLabel("");
      showToastRef.current("Checklist item added", "success");
      load();
    } catch (err) {
      showToastRef.current(err.message, "error");
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete checklist item "${item.label}"?`)) return;
    try {
      const res = await fetch(`/api/cleaning/checklist-items/${item._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete item");
      showToastRef.current("Checklist item deleted", "success");
      load();
    } catch (err) {
      showToastRef.current(err.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between rounded-xl border p-4">
            <span className="font-semibold text-slate-700">Enable Cleaning Checklist</span>
            <input
              type="checkbox"
              checked={workflowEnabled}
              onChange={(event) => saveWorkflowEnabled(event.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border p-4">
            <span className="font-semibold text-slate-700">Enable Cleaning Requests</span>
            <input
              type="checkbox"
              checked={cleaningRequestsEnabled}
              onChange={(event) => saveCleaningRequestsEnabled(event.target.checked)}
              className="w-5 h-5"
            />
          </label>
        </div>
      )}

      <div className="rounded-xl border p-4 bg-slate-50">
        <h3 className="font-black text-slate-900 mb-3">Add Checklist Item</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_220px_auto] gap-3">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Example: Room freshener"
            className="border rounded-lg px-3 py-2"
          />
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="border rounded-lg px-3 py-2"
            disabled={!isAdmin}
          >
            {isAdmin && <option value="universal">Universal</option>}
            <option value="hostel">Hostel Specific</option>
          </select>
          <input
            value={scope === "hostel" ? hostel || assignedHostel : ""}
            onChange={(event) => setHostel(event.target.value)}
            disabled={scope !== "hostel" || !isAdmin}
            placeholder="Hostel name"
            className="border rounded-lg px-3 py-2 disabled:bg-slate-100"
          />
          <button
            onClick={addItem}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 bg-slate-100 font-black text-slate-900">
          Checklist Items {loading ? "(Loading...)" : ""}
        </div>
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {itemsError && !loading && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50">{itemsError}</div>
          )}
          {items.map((item) => (
            <div key={item._id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">
                  {item.scope === "universal" ? "Universal" : `Hostel: ${item.hostel}`}
                </p>
              </div>
              {(isAdmin || item.hostel === assignedHostel) && (
                <button
                  onClick={() => deleteItem(item)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {!loading && !itemsError && items.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500">No checklist items found.</div>
          )}
        </div>
      </div>

      {isAdmin && hostelOptions.length > 0 && (
        <p className="text-xs text-slate-500">
          Hostel-specific items currently exist for: {hostelOptions.join(", ")}
        </p>
      )}
    </div>
  );
}
