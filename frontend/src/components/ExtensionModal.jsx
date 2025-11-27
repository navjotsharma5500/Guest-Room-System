import React, { useState } from "react";
import { motion } from "framer-motion";

// Keep wrapper so hooks are not conditional
export default function ExtensionModalWrapper(props) {
  if (!props.modal) return null;
  return <ExtensionModal {...props} />;
}

function ExtensionModal({ modal, onClose, onExtend }) {
  const [newTo, setNewTo] = useState(modal.booking?.to || "");

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-white rounded-xl p-5 w-[360px] shadow-xl"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        <h2 className="text-lg font-semibold text-red-700 mb-3">
          Extend Booking
        </h2>

        <label className="block text-sm mb-1">New Checkout Date</label>
        <input
          type="date"
          className="border rounded px-3 py-2 w-full mb-4"
          value={newTo}
          onChange={(e) => setNewTo(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={() => onExtend(newTo)}
            disabled={!newTo}
            className={`px-4 py-2 rounded text-white ${
              newTo
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Extend
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
