// src/components/ToastContainer.jsx
import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function ToastContainer({ toast }) {
  const { id, message, type } = toast;

  const bgColor =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : type === "info"
      ? "bg-blue-600"
      : "bg-gray-700";

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.3 }}
      className={`${bgColor} text-white fixed bottom-6 right-6 mb-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2`}
    >
      <span>{type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span>
      <span>{message}</span>
      <X size={14} className="ml-2 cursor-pointer opacity-80 hover:opacity-100" />
    </motion.div>
  );
}
