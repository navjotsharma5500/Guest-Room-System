// src/pages/admin/DashboardSelector.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  Calendar,
  ArrowRight,
  Sparkles,
  Lock
} from "lucide-react";

const DashboardSelector = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

  const dashboards = [
    {
      id: "guest-room",
      title: "Guest Room Dashboard",
      description: "Manage hostel rooms, bookings, and guest information",
      icon: Building2,
      gradient: "from-blue-600 via-blue-500 to-cyan-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      available: true,
      features: ["Room Management", "Guest Tracking", "Booking System"],
      onClick: () => navigate("/dashboard")
    },
    {
      id: "hall-booking",
      title: "Hall Booking Dashboard",
      description: "Oversee common hall reservations and event scheduling",
      icon: Calendar,
      gradient: "from-red-600 via-red-500 to-orange-500",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      available: true,
      features: ["Hall Reservations", "Event Calendar", "Availability Check"],
      onClick: () => navigate("/hall/dashboard") 
    },
    {
      id: "coming-soon",
      title: "Coming Soon",
      description: "New features and dashboards are on the way",
      icon: Sparkles,
      gradient: "from-purple-600 via-purple-500 to-pink-500",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      available: false,
      features: ["Advanced Analytics", "Mobile App", "AI Insights"]
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Header Section */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          {/* Logo/Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.2 
            }}
            className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-blue-600 to-red-600 rounded-3xl shadow-2xl"
          >
            <Users className="w-10 h-10 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Hostel Management
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-xl md:text-2xl text-slate-600 font-light"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Select your administrative dashboard
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
          {dashboards.map((dashboard, index) => {
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
                  disabled={!dashboard.available}
                  onClick={dashboard.onClick}
                  className={`
                    w-full h-full p-8 rounded-3xl border-2 shadow-xl
                    transition-all duration-500 text-left
                    ${dashboard.available 
                      ? 'bg-white/80 backdrop-blur-sm border-slate-200 hover:border-slate-300 hover:shadow-2xl cursor-pointer' 
                      : 'bg-slate-50/50 backdrop-blur-sm border-slate-200 cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  {/* Top Section - Icon & Status */}
                  <div className="flex items-start justify-between mb-6">
                    {/* Icon Container */}
                    <motion.div
                      animate={isHovered && dashboard.available ? { 
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

                    {/* Lock Icon for Coming Soon */}
                    {!dashboard.available && (
                      <div className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Locked
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
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8 + (idx * 0.1) }}
                        className="flex items-center gap-2 text-xs text-slate-500"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${dashboard.gradient}`} />
                        {feature}
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Section */}
                  {dashboard.available ? (
                    <motion.div
                      animate={isHovered ? { x: 5 } : { x: 0 }}
                      className={`
                        flex items-center gap-2 text-sm font-semibold
                        bg-gradient-to-r ${dashboard.gradient} bg-clip-text text-transparent
                      `}
                    >
                      Open Dashboard
                      <ArrowRight className={`w-4 h-4 text-${dashboard.iconColor.split('-')[1]}-600`} />
                    </motion.div>
                  ) : (
                    <div className="text-sm text-slate-400 font-medium">
                      Stay tuned for updates
                    </div>
                  )}

                  {/* Gradient Overlay on Hover */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered && dashboard.available ? 0.05 : 0 }}
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${dashboard.gradient} pointer-events-none`}
                  />
                </button>

                {/* Glow Effect on Hover */}
                {dashboard.available && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 0.2 : 0 }}
                    className={`
                      absolute inset-0 -z-10 rounded-3xl blur-2xl
                      bg-gradient-to-br ${dashboard.gradient}
                    `}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-slate-500 text-sm">
            Powered by Thapar Institute of Engineering & Technology
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-400">System Online</span>
          </div>
        </motion.div>
      </div>

      {/* Font Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default DashboardSelector;