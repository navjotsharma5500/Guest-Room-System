// src/pages/AnalyticsPage.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { parseISO, getMonth, getQuarter, getYear } from "date-fns";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function AnalyticsPage({ hostelData = {}, setActiveTab, theme }) {
  const [range, setRange] = React.useState("Monthly");

  // -------------------- ROLE-BASED ANALYTICS ACCESS --------------------
  const { currentUser } = useAuth();
  const role = currentUser?.role || "caretaker";
  const userHostel = currentUser?.hostel || null;

  // ===========================
  // ROLE-BASED ACCESS PROTECTION
  // ===========================
  React.useEffect(() => {
    if (role === "caretaker") {
      // Auto redirect safely (AFTER render)
      setActiveTab("Home");
    }
  }, [role, setActiveTab]);

    // Caretaker can NEVER see analytics
    if (role === "caretaker") {
      return (
        <main className="flex-1 ml-64 p-8 text-center text-gray-500">
          Redirecting...
        </main>
      );
    }
    
    // If manager → full access
    // If admin → full access
    // But caretaker filtered → show only own hostel
    if (role === "caretaker") {
      hostelData = Object.fromEntries(
        Object.entries(hostelData).filter(([name]) => name === userHostel)
      );
    }

  // Collect all bookings with full details
  const allBookings = Object.entries(hostelData).flatMap(([hostel, h]) =>
    (h.rooms || []).flatMap((room) =>
      (room.bookings || []).map((b) => ({
        hostel,
        roomNo: room.roomNo,
        roomType: room.roomType || "Guest Room",
        ...b,
        from: parseISO(b.from),
        to: parseISO(b.to),
        paymentType: b.paymentType || "Free",
        amount: b.amount || 0,
      }))
    )
  );

  // CSV Download Handler
  const handleDownloadCSV = () => {
    if (allBookings.length === 0) {
      alert("No booking data available.");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Hostel",
      "Room No",
      "Room Type",
      "Check-in",
      "Check-out",
      "Payment Type",
      "Amount",
    ];

    const rows = allBookings.map((b) => [
      b.guest || b.name || "—",
      b.email || "—",
      b.contact || "—",
      b.hostel,
      b.roomNo,
      b.roomType,
      b.from ? b.from.toISOString().split("T")[0] : "—",
      b.to ? b.to.toISOString().split("T")[0] : "—",
      b.paymentType,
      b.paymentType === "Paid" ? b.amount : 0,
    ]);

    // Calculate total paid amount
    const totalPaid = allBookings
      .filter((b) => b.paymentType === "Paid")
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    // Add total row
    rows.push(["", "", "", "", "", "", "", "", "Total Amount", totalPaid]);

    const csvContent =
      headers.join(",") +
      "\n" +
      rows.map((r) => r.map((v) => `"${String(v || "")}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_bookings_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Hostel counts
  const hostelCounts = Object.entries(hostelData).map(([name, h]) => ({
    name,
    bookings: (h.rooms || []).reduce((acc, r) => acc + (r.bookings?.length || 0), 0),
  }));

  // Free vs Paid
  const freeCount = allBookings.filter((b) => b.paymentType === "Free").length;
  const paidCount = allBookings.filter((b) => b.paymentType === "Paid").length;
  const pieData = [
    { name: "Free", value: freeCount },
    { name: "Paid", value: paidCount },
  ];

  // Trend data grouped by range
  const trendMap = {};
  allBookings.forEach((b) => {
    const date = b.from;
    let key = "Overall";
    switch (range) {
      case "Monthly":
        key = `${getMonth(date) + 1}-${getYear(date)}`;
        break;
      case "Quarterly":
        key = `Q${getQuarter(date)}-${getYear(date)}`;
        break;
      case "Annual":
        key = `${getYear(date)}`;
        break;
      default:
        key = "Overall";
    }
    trendMap[key] = (trendMap[key] || 0) + 1;
  });
  const trendData = Object.entries(trendMap).map(([period, count]) => ({ period, count }));

  const COLORS = ["#DC2626", "#60A5FA"]; // red & blue
  const dark = theme === "dark";
  const cardBg = dark ? "bg-[#0b0b10] text-gray-100" : "bg-white text-gray-900";

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`flex-1 p-8 min-h-screen ml-64 ${dark ? "bg-gray-900" : "bg-gray-50"}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-red-600">📈 Analytics</h1>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
            >
              <span>⬇</span> Download CSV
            </button>
            <button
              onClick={() => setActiveTab("Home")}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              🏠 Home
            </button>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          {["Monthly", "Quarterly", "Annual", "Overall"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg border ${
                range === r
                  ? "bg-red-600 text-white border-red-700"
                  : "bg-transparent border-gray-300 hover:bg-gray-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl shadow-md ${cardBg} border`}>
            <h2 className="text-lg font-semibold text-red-600 mb-3">Hostel-wise Bookings</h2>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={hostelCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#333" : "#eee"} />
                  <XAxis dataKey="name" stroke={dark ? "#ddd" : "#333"} />
                  <YAxis stroke={dark ? "#ddd" : "#333"} />
                  <Tooltip />
                  <Bar dataKey="bookings" radius={[8, 8, 0, 0]} fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`p-6 rounded-2xl shadow-md ${cardBg} border flex flex-col items-center`}>
            <h2 className="text-lg font-semibold text-red-600 mb-3">Free vs Paid</h2>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              <div>Free: <strong>{freeCount}</strong></div>
              <div>Paid: <strong>{paidCount}</strong></div>
            </div>
          </div>

          <div className={`col-span-1 lg:col-span-2 p-6 rounded-2xl shadow-md ${cardBg} border`}>
            <h2 className="text-lg font-semibold text-red-600 mb-3">Booking Trend ({range})</h2>
            <div style={{ width: "100%", height: 380 }}>
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#333" : "#eee"} />
                  <XAxis dataKey="period" stroke={dark ? "#ddd" : "#333"} />
                  <YAxis stroke={dark ? "#ddd" : "#333"} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#DC2626" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          Tip: Use the range selector to change aggregation (Monthly / Quarterly / Annual).
        </div>
      </div>
    </motion.main>
  );
}
