import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function CleaningChecklistManagement({ showToast = () => {} }) {
  const { currentUser } = useAuth();
  const role = String(currentUser?.role || currentUser?.user?.role || "").toLowerCase();
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel || "";
  const isAdmin = role === "admin";
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({
    enableCleaningChecklist: true,
    enableCleaningRequests: false,
  });
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState(isAdmin ? "universal" : "hostel");
  const [hostel, setHostel] = useState(assignedHostel);
  const [loading, setLoading] = useState(false);

  const hostelOptions = useMemo(
    () => Array.from(new Set(items.filter((item) => item.hostel).map((item) => item.hostel))).sort(),
    [items]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, settingsRes] = await Promise.all([
        fetch("/api/cleaning/checklist-items", { credentials: "include" }),
        fetch("/api/cleaning/settings", { credentials: "include" }),
      ]);
      const [itemsData, settingsData] = await Promise.all([itemsRes.json(), settingsRes.json()]);
      if (!itemsRes.ok) throw new Error(itemsData.message || "Failed to load checklist items");
      setItems(itemsData.items || []);
      if (settingsData?.cleaning) setSettings(settingsData.cleaning);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      const res = await fetch("/api/cleaning/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save settings");
      showToast("Cleaning settings updated", "success");
    } catch (err) {
      showToast(err.message, "error");
      load();
    }
  };

  const addItem = async () => {
    if (!label.trim()) {
      showToast("Enter checklist item name", "warning");
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
      showToast("Checklist item added", "success");
      load();
    } catch (err) {
      showToast(err.message, "error");
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
      showToast("Checklist item deleted", "success");
      load();
    } catch (err) {
      showToast(err.message, "error");
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
              checked={settings.enableCleaningChecklist}
              onChange={(event) => saveSettings({ enableCleaningChecklist: event.target.checked })}
              className="w-5 h-5"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border p-4">
            <span className="font-semibold text-slate-700">Enable Cleaning Requests</span>
            <input
              type="checkbox"
              checked={settings.enableCleaningRequests}
              onChange={(event) => saveSettings({ enableCleaningRequests: event.target.checked })}
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
          {items.length === 0 && (
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
