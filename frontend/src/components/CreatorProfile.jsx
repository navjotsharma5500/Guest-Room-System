import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, User, Github, Star, GitFork, Code } from "lucide-react";
import { useState, useEffect } from "react";

export default function CreatorProfile({ open, onClose }) {
  const [githubStats, setGithubStats] = useState({
    repos: 0,
    stars: 0,
    followers: 0,
    loading: true
  });

  useEffect(() => {
    if (open) {
      fetchGithubStats();
    }
  }, [open]);

  const fetchGithubStats = async () => {
    try {
      const response = await fetch('https://api.github.com/users/navjotsharma5500');
      const data = await response.json();
      
      setGithubStats({
        repos: data.public_repos || 0,
        stars: data.followers || 0, // You can calculate total stars by fetching all repos
        followers: data.followers || 0,
        loading: false
      });
    } catch (error) {
      console.error('Failed to fetch GitHub stats:', error);
      setGithubStats({
        repos: 0,
        stars: 0,
        followers: 0,
        loading: false
      });
    }
  };

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
          className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden"
        >
          {/* Background Gradient */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 -z-10" />
          
          {/* Close Button */}
          <div className="flex justify-end relative z-10">
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center relative z-10 -mt-4">
            {/* Profile Image - Circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative mb-6"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-xl border-4 border-white">
                <img
                  src="https://ik.imagekit.io/7khjnlfow/email-assets/IMG_4888.JPG"
                  alt="Navjot Sharma"
                  className="w-full h-full object-cover object-center"
                  style={{ objectPosition: '50% 30%' }}
                />
              </div>
              {/* Online Badge */}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-lg">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
              </div>
            </motion.div>

            {/* Name & Title */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                Mr. Navjot Sharma
              </h3>
              <p className="text-blue-600 font-semibold mb-1">Associate IT</p>
              <p className="text-slate-500 text-sm mb-4">All Hostels</p>
            </motion.div>

            {/* GitHub Stats */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="w-full mb-4"
            >
              <a
                href="https://github.com/navjotsharma5500"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 transition-colors group mb-3"
              >
                <Github className="w-5 h-5" />
                <span className="font-semibold">@navjotsharma5500</span>
              </a>

              {githubStats.loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3">
                    <Code className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-purple-900">{githubStats.repos}</p>
                    <p className="text-xs text-purple-600 font-medium">Repositories</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-3">
                    <Star className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-yellow-900">{githubStats.followers}</p>
                    <p className="text-xs text-yellow-600 font-medium">Followers</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                    <GitFork className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-900">{githubStats.repos}</p>
                    <p className="text-xs text-blue-600 font-medium">Projects</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full mt-2 space-y-3"
            >
              {/* Email */}
              <a
                href="mailto:navjot.sharma@thapar.edu"
                className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs text-slate-500 font-medium">Email</p>
                  <p className="text-sm text-slate-900 font-semibold">navjot.sharma@thapar.edu</p>
                </div>
              </a>

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
              transition={{ delay: 0.5 }}
              className="mt-6 pt-6 border-t border-slate-200 w-full"
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