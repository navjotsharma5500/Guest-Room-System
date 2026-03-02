import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Calendar, Moon, Globe, Search, Sparkles, Lock,
  MessageSquare, Star, ArrowRight, LogIn
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import EchoOrb from "../components/EchoOrb";
import EchoModal from "../components/EchoModal";
import DashboardFooter from "../components/DashboardFooter";

const PublicDashboardSelector = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showEcho, setShowEcho] = useState(false);
  const navigate = useNavigate();
  const { currentUser, login } = useAuth(); // Assuming login or we just redirect to /login

  const handleAuthNavigation = (path) => {
    if (currentUser) {
      navigate(path);
    } else {
      // If not logged in, we should redirect to login, 
      // passing the intended destination so they can be redirected back if possible.
      // For now, just go to login.
      navigate("/login");
    }
  };

  const publicDashboards = [
    {
      id: "guest-booking",
      title: "Guest Room Booking Form",
      description: "Book hostel guest rooms (Requires Google Login)",
      icon: Building2,
      gradient: "from-blue-600 via-blue-500 to-cyan-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      available: true,
      authRequired: true,
      onClick: () => handleAuthNavigation("/guest-enquiry"), // Assuming this is the form
      features: ["Room Availability", "Booking Request", "Status Tracking"]
    },
    {
      id: "venue-booking",
      title: "Event Venue Booking Form",
      description: "Book institute venues for events (Requires Google Login)",
      icon: Calendar,
      gradient: "from-purple-600 via-purple-500 to-pink-500",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      available: true,
      authRequired: true,
      onClick: () => handleAuthNavigation("/venue-guest-enquiry"), // Assuming this is the form
      features: ["Venue Search", "Event Registration", "Approval Status"]
    },
    {
      id: "feedback",
      title: "Guest Room Feedback Form",
      description: "Share your experience (Requires Google Login)",
      icon: MessageSquare,
      gradient: "from-teal-600 via-teal-500 to-emerald-500",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      available: true,
      authRequired: true,
      onClick: () => handleAuthNavigation("/guest-feedback"),
      features: ["Rate Stay", "Suggestions", "Report Issues"]
    },
    {
      id: "night-permissions",
      title: "Night Permissions",
      description: "Student Night Out & Dashboard (Requires Google Login)",
      icon: Moon,
      gradient: "from-amber-600 via-amber-500 to-yellow-400",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      available: true,
      authRequired: true,
      badge: { label: "STUDENT", bg: "bg-amber-100", text: "text-amber-700" },
      onClick: () => handleAuthNavigation("/night"),
      features: ["Apply for Pass", "Check Status", "QR Code"]
    },
    {
      id: "calendar",
      title: "Event Calendar",
      description: "View upcoming events and bookings",
      icon: Globe,
      gradient: "from-indigo-600 via-indigo-500 to-blue-500",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      available: true,
      authRequired: false,
      onClick: () => navigate("/venue-event-calendar"),
      features: ["Public Events", "Venue Availability", "Schedule"]
    },
    {
      id: "lost-found",
      title: "Lost & Found",
      description: "Report or find lost items on campus",
      icon: Search,
      gradient: "from-orange-600 via-orange-500 to-red-500",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      available: true,
      authRequired: false,
      onClick: () => window.open("https://lost-and-found-portal-six.vercel.app/", "_blank"),
      features: ["Search Items", "Report Lost", "Report Found"]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.03, 0.06, 0.03]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-red-400 to-orange-400 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-12 pb-32">
        {/* Header Section */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16 relative w-full max-w-7xl mx-auto"
        >
          {/* Login Button - Top Right */}
          {!currentUser && (
             <div className="absolute top-0 right-0 hidden md:block">
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => navigate("/login")}
                 className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
               >
                 <LogIn className="w-4 h-4" />
                 <span className="text-sm font-semibold">Admin / Staff Login</span>
               </motion.button>
             </div>
          )}

          {/* Thapar Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.2
            }}
            className="inline-flex items-center justify-center mb-6"
          >
            <img
              src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
              alt="Thapar Institute Logo"
              className="h-24 w-auto object-contain"
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 pb-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Thapar Operations
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-xl md:text-2xl text-slate-600 font-light"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Centralized portal for Guest Rooms, Venues & Student Services
          </motion.p>

          {/* Decorative Line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="w-24 h-1 bg-gradient-to-r from-blue-600 to-red-600 mx-auto mt-6 rounded-full"
          />
        </motion.div>

        {/* Dashboard Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl w-full"
        >
          {publicDashboards.map((dashboard, index) => {
            const Icon = dashboard.icon;
            const isHovered = hoveredCard === dashboard.id;

            return (
              <motion.div
                key={dashboard.id}
                variants={itemVariants}
                onMouseEnter={() => setHoveredCard(dashboard.id)}
                onMouseLeave={() => setHoveredCard(null)}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group"
              >
                <button
                  onClick={dashboard.onClick}
                  className={`
                    w-full h-full p-8 rounded-3xl border-2 shadow-xl
                    transition-all duration-500 text-left
                    bg-white/80 backdrop-blur-sm border-slate-200 hover:border-slate-300 hover:shadow-2xl cursor-pointer
                  `}
                >
                  {/* Top Section - Icon & Status */}
                  <div className="flex items-start justify-between mb-6">
                    {/* Icon Container */}
                    <motion.div
                      animate={isHovered ? {
                        rotate: [0, -5, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      } : {}}
                      transition={{ duration: 0.5 }}
                      className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center
                        ${dashboard.iconBg} shadow-lg
                      `}
                    >
                      <Icon className={`w-8 h-8 ${dashboard.iconColor}`} />
                    </motion.div>

                    {/* Google Auth Badge */}
                    {dashboard.authRequired && !currentUser && (
                      <div className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                        <Lock className="w-3 h-3" />
                        Google Auth
                      </div>
                    )}
                    
                    {dashboard.badge && (
                      <div className={`${dashboard.badge.bg} ${dashboard.badge.text} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
                        <Sparkles className="w-3 h-3" />
                        {dashboard.badge.label}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-slate-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {dashboard.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    {dashboard.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-2 mb-6">
                    {dashboard.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        className="flex items-center gap-2 text-slate-500"
                        initial={{ opacity: 0.6, x: 0 }}
                        whileHover={{ opacity: 1, x: 4 }}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${dashboard.iconBg.replace('bg-', 'bg-').replace('100', '400')}`} />
                        <span className="text-xs font-medium">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Action Link */}
                  <div className={`flex items-center gap-2 font-semibold text-sm ${dashboard.iconColor} group-hover:translate-x-2 transition-transform duration-300`}>
                    {dashboard.authRequired && !currentUser ? "Login to Access" : "Open Portal"} <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ECHO FAB */}
      <EchoOrb onClick={() => setShowEcho(true)} />

      <AnimatePresence>
        {showEcho && <EchoModal open={showEcho} onClose={()=>setShowEcho(false)} role="public" userName={currentUser?.name || "Guest"} />}
      </AnimatePresence>
      
      <DashboardFooter />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default PublicDashboardSelector;
