import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, User, Github, Star, GitFork, Code, ExternalLink, Linkedin } from "lucide-react";
import { useState, useEffect } from "react";

export default function CreatorProfileRectangular({ open, onClose }) {
  const [githubStats, setGithubStats] = useState({
    repos: 0,
    followers: 0,
    following: 0,
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
        followers: data.followers || 0,
        following: data.following || 0,
        loading: false
      });
    } catch (error) {
      console.error('Failed to fetch GitHub stats:', error);
      setGithubStats({
        repos: 0,
        followers: 0,
        following: 0,
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
                    src="https://ik.imagekit.io/7khjnlfow/email-assets/IMG_4888.JPG"
                    alt="Navjot Sharma"
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
                Mr. Navjot Sharma
              </h3>
              <p className="text-blue-600 font-semibold mb-1">Associate IT</p>
              <p className="text-slate-500 text-sm">All Hostels</p>
            </motion.div>

            {/* GitHub Section */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mb-6"
            >
              {/* GitHub Profile Link */}
              <a
                href="https://github.com/navjotsharma5500"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-3 transition-all group mb-4 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-xs text-slate-400">GitHub Profile</p>
                    <p className="font-semibold">@navjotsharma5500</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>

              {/* GitHub Stats */}
              {githubStats.loading ? (
                <div className="flex items-center justify-center py-6 bg-slate-50 rounded-xl">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center"
                  >
                    <Code className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-900 mb-1">{githubStats.repos}</p>
                    <p className="text-xs text-purple-600 font-medium">Repos</p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.45 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center"
                  >
                    <Star className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-900 mb-1">{githubStats.followers}</p>
                    <p className="text-xs text-blue-600 font-medium">Followers</p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center"
                  >
                    <GitFork className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-900 mb-1">{githubStats.following}</p>
                    <p className="text-xs text-green-600 font-medium">Following</p>
                  </motion.div>
                </div>
              )}
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="space-y-3 mb-6"
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

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/navjot-sharma-0bb7143b1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Linkedin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs text-slate-500 font-medium">LinkedIn</p>
                  <p className="text-sm text-slate-900 font-semibold">Connect on LinkedIn</p>
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
              transition={{ delay: 0.6 }}
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