import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, User, Building2 } from "lucide-react";

export default function CreatorProfileRectangular({ open, onClose }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
        >
          {/* Close Button */}
          <div className="absolute top-4 right-4 z-20">
            <button 
              onClick={onClose}
              className="bg-white/90 backdrop-blur-sm hover:bg-white text-slate-700 rounded-full p-2 shadow-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header with Gradient Background */}
          <div className="relative h-48 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Decorative Elements */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>

          {/* Profile Content */}
          <div className="px-8 pb-8">
            {/* Profile Image - Rectangular with better positioning */}
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative -mt-20 mb-4 flex justify-center"
            >
              <div className="relative">
                <div className="w-36 h-36 rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-white">
                  <img
                    src="https://ik.imagekit.io/7khjnlfow/email-assets/ChatGPT Image Mar 13, 2026, 02_52_10 AM.png"
                    alt="DoSA Office"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: '50% 20%' }}
                  />
                </div>
                {/* Online Badge */}
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-lg">
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                </div>
              </div>
            </motion.div>

            {/* Name & Title */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                DoSA Office
              </h3>
              <p className="text-blue-600 font-semibold mb-1">Associate IT</p>
              <p className="text-slate-500 text-sm">All Hostels</p>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 mb-6"
            >
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs text-slate-500 font-medium">Email</p>
                  <p className="text-sm text-slate-900 font-semibold">DoSA Office</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs text-slate-500 font-medium">Department</p>
                  <p className="text-sm text-slate-900 font-semibold">DoSA Office</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs text-slate-500 font-medium">Role</p>
                  <p className="text-sm text-slate-900 font-semibold">System Developer</p>
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="pt-4 border-t border-slate-200 text-center"
            >
              <p className="text-xs text-slate-400">
                Thapar Institute of Engineering & Technology
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
