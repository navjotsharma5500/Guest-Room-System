import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";

export default function CleaningChecklistModal({ hostel, room, onClose, onDone, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cleaning/checklist-items?hostel=${encodeURIComponent(hostel)}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load checklist");
        setItems((data.items || []).map((item) => ({
          checklistItemId: item._id,
          label: item.label,
          checked: false,
          remarks: "",
          damageNotes: "",
          missingItemNotes: "",
        })));
      } catch (err) {
        showToast?.(err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hostel, showToast]);

  const allChecked = useMemo(() => items.length > 0 && items.every((item) => item.checked), [items]);

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const submitChecklist = async () => {
    if (!allChecked) {
      showToast?.("Verify all checklist items before submitting.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cleaning/rooms/${encodeURIComponent(hostel)}/${encodeURIComponent(room.roomNo)}/checklist`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Checklist submission failed");
      showToast?.("Cleaning checklist submitted.", "success");
      onDone?.();
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Cleaning Checklist</h2>
            <p className="text-sm text-slate-500">{hostel} • {room.roomNo}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)] space-y-3">
          {loading ? (
            <div className="text-center text-slate-500 py-12">Loading checklist...</div>
          ) : (
            items.map((item, index) => (
              <div key={`${item.label}-${index}`} className="rounded-xl border p-4 bg-slate-50">
                <label className="flex items-center gap-3 font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(event) => updateItem(index, { checked: event.target.checked })}
                    className="w-5 h-5"
                  />
                  {item.label}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <input
                    value={item.remarks}
                    onChange={(event) => updateItem(index, { remarks: event.target.value })}
                    placeholder="Remarks"
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={item.damageNotes}
                    onChange={(event) => updateItem(index, { damageNotes: event.target.value })}
                    placeholder="Damage notes"
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={item.missingItemNotes}
                    onChange={(event) => updateItem(index, { missingItemNotes: event.target.value })}
                    placeholder="Missing item notes"
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t flex flex-wrap justify-between gap-3">
          <button
            onClick={() => setItems((prev) => prev.map((item) => ({ ...item, checked: true, remarks: item.remarks || "All good" })))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 font-bold hover:bg-green-100"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark All Good
          </button>
          <button
            disabled={submitting || !allChecked}
            onClick={submitChecklist}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            Submit Checklist
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
