// src/components/AllHostels/SelectionFooter.jsx
import React from "react";
import { motion } from "framer-motion";
import { CheckSquare } from "lucide-react";

export default function SelectionFooter({ selectedCount, onDone }) {
  return (
    <motion.button
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(220, 38, 38, 0.4)" }}
      whileTap={{ scale: 0.95 }}
      onClick={onDone}
      className="fixed bottom-6 right-6 bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 z-40 font-semibold text-lg"
    >
      <CheckSquare size={24} />
      <span>Done</span>
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="bg-white text-red-600 px-3 py-1 rounded-full font-bold"
      >
        {selectedCount}
      </motion.span>
    </motion.button>
  );
}