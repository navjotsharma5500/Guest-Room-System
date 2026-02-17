// src/pages/admin/DashboardSelector.jsx - UPDATED WITH VENUE BOOKING
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  Calendar,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  HelpCircle,
  Globe,
  MessageSquare,
  CalendarDays,
  FileText,
  X,
  Search
} from "lucide-react";
import CreatorProfile from "../../components/CreatorProfile";

const PublicFormsModal = ({ open, onClose }) => {
  if (!open) return null;

  const forms = [
    {
      title: "Guest Room Booking Form",
      description: "Book guest rooms for visitors",
      url: "http://guestapp.in/guest-enquiry",
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      hover: "hover:border-blue-400"
    },
    {
      title: "Guest Room Feedback Form",
      description: "Submit feedback for your stay",
      url: "http://guestapp.in/guest-feedback",
      icon: MessageSquare,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      hover: "hover:border-green-400"
    },
    {
      title: "Venue Booking Form",
      description: "Book venues for events",
      url: "http://guestapp.in/venue-guest-enquiry",
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
      hover: "hover:border-purple-400"
    },
    {
      title: "Event Calendar Page",
      description: "View upcoming events",
      url: "http://guestapp.in/venue-event-calendar",
      icon: CalendarDays,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      hover: "hover:border-orange-400"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Globe className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Public Forms
              </h2>
              <p className="text-sm text-slate-500">Access public booking portals and calendars</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50">
          {forms.map((form, index) => (
            <motion.a
              key={index}
              href={form.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300 group bg-white ${form.border} ${form.hover} hover:shadow-lg cursor-pointer`}
            >
              <div className={`p-3 rounded-lg ${form.bg} ${form.color} group-hover:scale-110 transition-transform duration-300`}>
                <form.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {form.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {form.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            These links open in a new tab
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const DashboardSelector = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showCreatorProfile, setShowCreatorProfile] = useState(false);
  const [showPublicForms, setShowPublicForms] = useState(false);
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
      id: "venue-booking",
      title: "Venue Booking Dashboard",
      description: "Manage institute venues, events, and hall bookings",
      icon: Calendar,
      gradient: "from-purple-600 via-purple-500 to-pink-500",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      available: true,
      features: ["Venue Management", "Event Calendar", "Enquiry System"],
      onClick: () => navigate("/venue-booking")
    },
    {
      id: "public-forms",
      title: "Public Forms",
      description: "Access public booking forms and calendars",
      icon: Globe,
      gradient: "from-teal-600 via-teal-500 to-emerald-500",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      available: true,
      features: ["Guest Enquiry", "Feedback Form", "Venue Enquiry", "Event Calendar"],
      onClick: () => setShowPublicForms(true)
    },
    {
      id: "lost-and-found",
      title: "Lost and Found",
      description: "Search and report lost or found items",
      icon: Search,
      gradient: "from-indigo-600 via-indigo-500 to-blue-500",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      available: true,
      features: ["Report Missing Items", "Browse Found Items", "Track Status"],
      onClick: () => window.open("https://lost-and-found-portal-six.vercel.app/", "_blank")
    },
    {
      id: "coming-soon",
      title: "Coming Soon",
      description: "New features and dashboards are on the way",
      icon: Sparkles,
      gradient: "from-orange-600 via-orange-500 to-yellow-500",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
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

                    {/* NEW Badge for Venue Booking */}
                    {dashboard.id === "venue-booking" && (
                      <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        NEW
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

      {/* Bottom Right Corner - Creator & Support */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-20"
      >
        {/* Support Button */}
        <motion.a
          href="mailto:navjot.sharma@thapar.edu"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-400 rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <HelpCircle className="w-4 h-4 text-blue-600 group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-semibold text-blue-600">Support</span>
        </motion.a>

        {/* Creator Profile Button */}
        <motion.button
          onClick={() => setShowCreatorProfile(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white/90 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-300 rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <span className="text-xs text-slate-600">
            Created by <span className="font-semibold text-slate-900">Navjot Sharma</span>
          </span>
        </motion.button>
      </motion.div>

      {/* Creator Profile Modal */}
      <CreatorProfile 
        open={showCreatorProfile} 
        onClose={() => setShowCreatorProfile(false)} 
      />
      
      {/* Public Forms Modal */}
      <PublicFormsModal
        open={showPublicForms}
        onClose={() => setShowPublicForms(false)}
      />

      {/* Font Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default DashboardSelector;