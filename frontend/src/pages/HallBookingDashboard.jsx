// src/pages/HallBookingDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Calendar, Users, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import HallBookingsPortal from "./HallBookingsPortal";
import HallSidebar from "../components/HallBookings/HallSidebar";
import useHallDataPolling from "../hooks/useHallDataPolling";

export default function HallBookingDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [theme] = useState("light");
  const [activeSection, setActiveSection] = useState("home");

  // Real-time hall data
  const { hallData, loading, hasData, error, lastUpdate, connected, refresh } = useHallDataPolling({});

  // Calculate statistics
  const stats = React.useMemo(() => {
    let totalRooms = 0;
    let bookedRooms = 0;
    let activeBookings = 0;
    let upcomingBookings = 0;

    const now = new Date();

    Object.values(hallData || {}).forEach((hall) => {
      (hall.rooms || []).forEach((room) => {
        totalRooms++;
        
        const activeRoomBookings = (room.bookings || []).filter((b) => {
          if (b.status !== "booked" && b.status !== "checked_in") return false;
          
          const checkoutDate = new Date(b.to || b.checkOutDate);
          const time = b.checkOutTime || "23:59";
          const [h, m] = time.split(":").map(Number);
          checkoutDate.setHours(h, m, 0, 0);
          
          return checkoutDate >= now;
        });

        if (activeRoomBookings.length > 0) {
          bookedRooms++;
        }

        activeRoomBookings.forEach((b) => {
          if (b.status === "checked_in") {
            activeBookings++;
          } else if (b.status === "booked") {
            upcomingBookings++;
          }
        });
      });
    });

    return {
      totalRooms,
      bookedRooms,
      availableRooms: totalRooms - bookedRooms,
      activeBookings,
      upcomingBookings,
      totalBookings: activeBookings + upcomingBookings,
    };
  }, [hallData]);

  const handleBackHome = () => {
    const role = currentUser?.role || currentUser?.user?.role;
    if (role === "admin") {
      navigate("/admin/dashboard-selector");
    } else {
      navigate("/");
    }
  };

  const handleNavigate = (section) => {
    setActiveSection(section);
  };

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Sidebar */}
      <HallSidebar
        theme={theme}
        onNavigate={handleNavigate}
        activeSection={activeSection}
      />

      {/* Main Content */}
      <div className="flex-1 ml-[250px] overflow-hidden">
        {activeSection === "home" ? (
          <div className="h-full overflow-y-auto">
            {/* Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/95 backdrop-blur-md border-b-2 border-gray-200 shadow-lg sticky top-0 z-30"
            >
              <div className="flex justify-between items-center px-8 py-6">
                <div className="flex items-center gap-4">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center shadow-xl"
                  >
                    <Calendar className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Hall Booking Dashboard
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Manage all common hall reservations
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBackHome}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
                >
                  <Home size={18} />
                  Back to Home
                </motion.button>
              </div>
            </motion.div>

            {/* Dashboard Content */}
            <div className="p-8">
              {/* Connection Status Banner */}
              {!connected && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800">Connection Lost</p>
                    <p className="text-sm text-yellow-700">Attempting to reconnect to real-time updates...</p>
                  </div>
                </motion.div>
              )}

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  {
                    title: "Total Halls",
                    value: stats.totalRooms,
                    icon: Users,
                    gradient: "from-blue-600 to-cyan-600",
                    bgColor: "bg-blue-50",
                    iconColor: "text-blue-600",
                  },
                  {
                    title: "Currently Booked",
                    value: stats.bookedRooms,
                    icon: Calendar,
                    gradient: "from-red-600 to-orange-600",
                    bgColor: "bg-red-50",
                    iconColor: "text-red-600",
                  },
                  {
                    title: "Available Now",
                    value: stats.availableRooms,
                    icon: TrendingUp,
                    gradient: "from-green-600 to-emerald-600",
                    bgColor: "bg-green-50",
                    iconColor: "text-green-600",
                  },
                  {
                    title: "Active Bookings",
                    value: stats.activeBookings,
                    icon: Clock,
                    gradient: "from-purple-600 to-pink-600",
                    bgColor: "bg-purple-50",
                    iconColor: "text-purple-600",
                  },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600 font-medium mb-2">{stat.title}</p>
                          <p className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                            {loading ? "..." : stat.value}
                          </p>
                        </div>
                        <div className={`w-16 h-16 rounded-2xl ${stat.bgColor} flex items-center justify-center shadow-lg`}>
                          <Icon className={`w-8 h-8 ${stat.iconColor}`} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200"
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(220, 38, 38, 0.2)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSection("portal")}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg transition-all"
                  >
                    <Calendar className="w-8 h-8" />
                    <div className="text-left">
                      <p className="font-bold text-lg">Manage Bookings</p>
                      <p className="text-sm text-red-100">View and manage all hall bookings</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.2)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={refresh}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg transition-all"
                  >
                    <TrendingUp className="w-8 h-8" />
                    <div className="text-left">
                      <p className="font-bold text-lg">Refresh Data</p>
                      <p className="text-sm text-blue-100">Get latest booking information</p>
                    </div>
                  </motion.button>
                </div>
              </motion.div>

              {/* System Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 flex justify-between items-center text-sm text-slate-500"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                  <span>{connected ? "Real-time updates active" : "Reconnecting..."}</span>
                </div>
                <div>
                  Last updated: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <HallBookingsPortal
            hallData={hallData}
            setHallData={() => {}} // Handled by polling hook
            theme={theme}
            onBackHome={() => setActiveSection("home")}
          />
        )}
      </div>

      {/* Font Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');
      `}</style>
    </div>
  );
}