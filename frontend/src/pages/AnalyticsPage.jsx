// src/pages/AnalyticsPage.jsx - COMPLETE ENHANCED VERSION
// Replace your entire AnalyticsPage.jsx file with this code

import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
  LineChart, Line, Legend, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { parseISO, getMonth, getQuarter, getYear, format } from "date-fns";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Creator from "../components/Creator";
import { BACKEND_URL } from "../utils/apiConfig";

const COLORS = {
  primary: "#DC2626",
  secondary: "#60A5FA", 
  success: "#10B981",
  warning: "#F59E0B",
  info: "#6366F1",
  danger: "#EF4444"
};

// Lucide Icons (inline SVG to avoid import issues)
const TrendingUpIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const IndianRupeeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 3h12"></path>
    <path d="M6 8h12"></path>
    <path d="M6 13l8.5 8"></path>
    <path d="M6 13h3a5 5 0 0 0 5-5V8"></path>
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const DownloadIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
        {trend && (
          <div className={`text-xs mt-2 flex items-center gap-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUpIcon />
            <span>{Math.abs(trend)}% vs last period</span>
          </div>
        )}
      </div>
      <div className="p-3 rounded-xl" style={{ backgroundColor: `${COLORS[color]}15` }}>
        <Icon className="w-6 h-6" style={{ color: COLORS[color] || color }} />
      </div>
    </div>
  </motion.div>
);

export default function AnalyticsPage({ setActiveTab }) {
  const [range, setRange] = useState("Monthly");
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const role = currentUser?.role || "caretaker";

  // Fetch ALL bookings including historical data
  useEffect(() => {
    const fetchAllBookings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const API = BACKEND_URL;
        
        // ✅ Check if token exists
        if (!token) {
          console.error("❌ No authentication token found");
          setActiveTab("Home"); // Redirect to login
          return;
        }

        const response = await fetch(`${API}/api/bookings/all-for-download`, {
          method: "GET",
          credentials: "include", // ✅ Include cookies
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        // ✅ Handle 401 Unauthorized
        if (response.status === 401) {
          console.error("❌ Unauthorized - Token may be expired");
          localStorage.removeItem("token"); // Clear invalid token
          alert("Session expired. Please login again.");
          window.location.href = "/login"; // Or use your auth redirect
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // ✅ Validate response structure
        if (!data || !data.hostels) {
          console.warn("⚠️ No hostel data returned");
          setAllBookings([]);
          return;
        }

        setLoading(false);
        
        // Extract all bookings from hostel structure
        const bookings = [];
        data.hostels.forEach(hostel => {
          if (hostel.rooms && Array.isArray(hostel.rooms)) {
            hostel.rooms.forEach(room => {
              if (room.bookings && Array.isArray(room.bookings)) {
                room.bookings.forEach(booking => {
                  try {
                    bookings.push({
                      ...booking,
                      hostel: hostel.name,
                      roomNo: room.roomNo,
                      from: parseISO(booking.from),
                      to: parseISO(booking.to),
                    });
                  } catch (dateError) {
                    console.error("❌ Error parsing booking dates:", dateError);
                  }
                });
              }
            });
          }
        });

        console.log("📊 Total bookings fetched:", bookings.length);
        setAllBookings(bookings);
        
      } catch (err) {
        console.error("❌ Failed to fetch analytics data:", err);

        setLoading(false);
        
        // ✅ Show user-friendly error
        if (err.message.includes("Failed to fetch")) {
          alert("Network error. Please check your connection and try again.");
        } else {
          alert(`Error loading analytics: ${err.message}`);
        }
        
        setAllBookings([]); // Set empty array to prevent crashes
      }
    };

    fetchAllBookings();
  }, [setActiveTab]); // ✅ Add setActiveTab to dependencies

  // Role-based redirect
  useEffect(() => {
    if (role === "caretaker") {
      setActiveTab("Home");
    }
  }, [role, setActiveTab]);

  if (role === "caretaker") {
    return (
      <main className="flex-1 ml-64 p-8 text-center text-gray-500">
        Redirecting...
      </main>
    );
  }

  // ======================== CALCULATIONS ========================

  // Total Statistics
  const totalBookings = allBookings.length;
  const bookedCount = allBookings.filter(b => b.status === "booked").length;
  const reportedCount = allBookings.filter(b => b.reportedStatus === "reported" || b.status === "checked_in").length;
  const checkedOutCount = allBookings.filter(b => b.status === "checked_out").length;
  const cancelledCount = allBookings.filter(b => b.status === "cancelled").length;
  const noShowCount = allBookings.filter(b => b.status === "no_show").length;

  // Payment Statistics
  const freeBookings = allBookings.filter(b => b.paymentType === "Free");
  const paidBookings = allBookings.filter(b => b.paymentType === "Paid");
  
  const totalRevenue = allBookings.reduce((sum, b) => {
    if (b.paymentType === "Paid") {
      return sum + (Number(b.paidAmount) || 0);
    }
    return sum;
  }, 0);

  const totalBilled = allBookings.reduce((sum, b) => {
    if (b.paymentType === "Paid") {
      return sum + (Number(b.totalAmount) || 0);
    }
    return sum;
  }, 0);

  const totalDiscount = allBookings.reduce((sum, b) => {
    return sum + (Number(b.discount) || 0);
  }, 0);

  const pendingAmount = totalBilled - totalRevenue - totalDiscount;

  const fullyPaidCount = allBookings.filter(b => 
    b.paymentType === "Paid" && b.paymentStatus === "PAID"
  ).length;

  const partiallyPaidCount = allBookings.filter(b => 
    b.paymentType === "Paid" && b.paymentStatus === "PARTIALLY_PAID"
  ).length;

  const unpaidCount = allBookings.filter(b => 
    b.paymentType === "Paid" && b.paymentStatus === "UNPAID"
  ).length;

  // Status Distribution
  const statusData = [
    { name: "Booked", value: bookedCount, color: COLORS.info },
    { name: "Checked In", value: reportedCount, color: COLORS.warning },
    { name: "Checked Out", value: checkedOutCount, color: COLORS.success },
    { name: "Cancelled", value: cancelledCount, color: COLORS.danger },
    { name: "No Show", value: noShowCount, color: "#6B7280" },
  ].filter(item => item.value > 0);

  // Payment Status Distribution
  const paymentStatusData = [
    { name: "Fully Paid", value: fullyPaidCount, color: COLORS.success },
    { name: "Partially Paid", value: partiallyPaidCount, color: COLORS.warning },
    { name: "Unpaid", value: unpaidCount, color: COLORS.danger },
    { name: "Free", value: freeBookings.length, color: COLORS.secondary },
  ].filter(item => item.value > 0);

  // Hostel-wise Distribution
  const hostelCounts = {};
  allBookings.forEach(b => {
    hostelCounts[b.hostel] = (hostelCounts[b.hostel] || 0) + 1;
  });

  const hostelData = Object.entries(hostelCounts).map(([name, count]) => ({
    name,
    bookings: count,
  }));

  // Revenue by Hostel
  const hostelRevenue = {};
  allBookings.forEach(b => {
    if (b.paymentType === "Paid") {
      hostelRevenue[b.hostel] = (hostelRevenue[b.hostel] || 0) + (Number(b.paidAmount) || 0);
    }
  });

  const revenueData = Object.entries(hostelRevenue).map(([name, revenue]) => ({
    name,
    revenue: Math.round(revenue),
  }));

  // Trend Data
  const trendMap = {};
  allBookings.forEach(b => {
    const date = b.from;
    let key = "Overall";
    
    try {
      switch (range) {
        case "Monthly":
          key = format(date, "MMM yyyy");
          break;
        case "Quarterly":
          key = `Q${getQuarter(date)} ${getYear(date)}`;
          break;
        case "Annual":
          key = `${getYear(date)}`;
          break;
        default:
          key = "All Time";
      }
      trendMap[key] = (trendMap[key] || 0) + 1;
    } catch (err) {
      console.error("Date formatting error:", err);
    }
  });

  const trendData = Object.entries(trendMap)
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Revenue Trend
  const revenueTrendMap = {};
  allBookings.forEach(b => {
    if (b.paymentType === "Paid" && b.paidAmount) {
      const date = b.from;
      let key = "Overall";
      
      try {
        switch (range) {
          case "Monthly":
            key = format(date, "MMM yyyy");
            break;
          case "Quarterly":
            key = `Q${getQuarter(date)} ${getYear(date)}`;
            break;
          case "Annual":
            key = `${getYear(date)}`;
            break;
          default:
            key = "All Time";
        }
        revenueTrendMap[key] = (revenueTrendMap[key] || 0) + Number(b.paidAmount);
      } catch (err) {
        console.error("Revenue trend error:", err);
      }
    }
  });

  const revenueTrendData = Object.entries(revenueTrendMap)
    .map(([period, revenue]) => ({ period, revenue: Math.round(revenue) }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // CSV Download
  const handleDownloadCSV = () => {
    if (allBookings.length === 0) {
      alert("No booking data available.");
      return;
    }

    const headers = [
      "Name", "Email", "Phone", "Hostel", "Room No", "Check-in", "Check-out",
      "Status", "Reported Status", "Payment Type", "Total Amount", "Paid Amount",
      "Balance", "Discount", "Payment Status"
    ];

    const rows = allBookings.map(b => [
      b.guest || "—",
      b.email || "—",
      b.contact || "—",
      b.hostel,
      b.roomNo,
      b.from ? format(b.from, "dd-MMM-yyyy") : "—",
      b.to ? format(b.to, "dd-MMM-yyyy") : "—",
      b.status,
      b.reportedStatus || "pending",
      b.paymentType,
      b.totalAmount || 0,
      b.paidAmount || 0,
      b.balanceAmount || 0,
      b.discount || 0,
      b.paymentStatus || "—"
    ]);

    rows.push(["", "", "", "", "", "", "", "", "", "Total Revenue", "", totalRevenue, "", totalDiscount]);

    const csvContent =
      headers.join(",") +
      "\n" +
      rows.map(r => r.map(v => `"${String(v || "")}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex-1 p-8 min-h-screen ml-64 bg-gradient-to-br from-gray-50 to-gray-100"
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">📊 Analytics Dashboard</h1>
            <p className="text-gray-600">Complete booking and revenue analytics</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <DownloadIcon className="w-4 h-4" />
              Download CSV
            </button>
            <button
              onClick={() => setActiveTab("Home")}
              className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
            >
              🏠 Home
            </button>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex gap-3 mb-8">
          {["Monthly", "Quarterly", "Annual", "Overall"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                range === r
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mb-4"></div>
            <p className="text-gray-600 font-semibold">Loading analytics data...</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && allBookings.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-200">
            <div className="text-gray-400 mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Booking Data Available</h3>
            <p className="text-gray-500">There are no bookings to display analytics for.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Show content only when not loading and has data */}
        {!loading && allBookings.length > 0 && (
          <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Bookings"
            value={totalBookings}
            subtitle="All time"
            icon={UsersIcon}
            color="info"
          />
          <StatCard
            title="Total Revenue"
            value={`₹${totalRevenue.toLocaleString()}`}
            subtitle={`Billed: ₹${totalBilled.toLocaleString()}`}
            icon={IndianRupeeIcon}
            color="success"
          />
          <StatCard
            title="Active Guests"
            value={reportedCount}
            subtitle="Currently checked in"
            icon={CheckCircleIcon}
            color="warning"
          />
          <StatCard
            title="Pending Amount"
            value={`₹${pendingAmount.toLocaleString()}`}
            subtitle={`Discount: ₹${totalDiscount.toLocaleString()}`}
            icon={ClockIcon}
            color="danger"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Booked</span>
                <span className="font-bold text-blue-600">{bookedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Checked In</span>
                <span className="font-bold text-orange-600">{reportedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Checked Out</span>
                <span className="font-bold text-green-600">{checkedOutCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cancelled</span>
                <span className="font-bold text-red-600">{cancelledCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">No Show</span>
                <span className="font-bold text-gray-600">{noShowCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fully Paid</span>
                <span className="font-bold text-green-600">{fullyPaidCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Partially Paid</span>
                <span className="font-bold text-orange-600">{partiallyPaidCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Unpaid</span>
                <span className="font-bold text-red-600">{unpaidCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Free Bookings</span>
                <span className="font-bold text-blue-600">{freeBookings.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Billed</span>
                <span className="font-bold text-gray-900">₹{totalBilled.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Collected</span>
                <span className="font-bold text-green-600">₹{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Wave Off</span>
                <span className="font-bold text-orange-600">₹{totalDiscount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="font-bold text-red-600">₹{pendingAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Booking Status Pie */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={statusData} 
                  dataKey="value" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Status Pie */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={paymentStatusData} 
                  dataKey="value" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Hostel-wise Bookings */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Hostel</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hostelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Bar dataKey="bookings" radius={[8, 8, 0, 0]} fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Hostel */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Hostel</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill={COLORS.success} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Trend ({range})</h2>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke={COLORS.primary} 
                  fillOpacity={1} 
                  fill="url(#colorBookings)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend ({range})</h2>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={COLORS.success} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Last updated: {format(new Date(), "PPpp")}
          </p>
          <Creator variant="default" />
        </div>
      </>
    )} 
    </div> 
  </motion.main>
);
}