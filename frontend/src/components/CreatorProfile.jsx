import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function CreatorProfile({ open, onClose }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl p-6 w-[360px]"
        >
          <div className="flex justify-end">
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <img
              src="/navjot.jpg"   // put image in public/
              alt="Navjot Sharma"
              className="w-32 h-32 rounded-xl object-cover shadow-md mb-4"
            />

            <h3 className="text-xl font-semibold">Mr. Navjot Sharma</h3>
            <p className="text-gray-600">Associate IT</p>
            <p className="text-gray-500">All Hostels</p>

            <p className="mt-2 text-sm text-gray-700 font-medium">
              itmh@thapar.edu
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
