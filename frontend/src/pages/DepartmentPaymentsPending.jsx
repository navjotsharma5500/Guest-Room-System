import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Clock, IndianRupee, ShieldAlert } from "lucide-react";
import PaymentModal from "../components/PaymentModal";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

export default function DepartmentPaymentsPending({ onBack, currentUser, theme }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalAmount: 0 });
  const [paymentModal, setPaymentModal] = useState(null);

  // ✅ ROLE-BASED ACCESS CONTROL
  const role = currentUser?.role || currentUser?.user?.role;
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel;
  const isRestrictedRole = role === 'caretaker' || role === 'warden';
  const canAccessPage = ['admin', 'manager', 'caretaker', 'warden'].includes(role);

  useEffect(() => {
    if (canAccessPage) {
      fetchPendingPayments();
    }
  }, [canAccessPage]);

  const fetchPendingPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${API}/api/department-payments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      
      // ✅ CLIENT-SIDE FILTERING (backup - backend should already filter)
      let filteredData = data.data || [];
      
      if (isRestrictedRole && assignedHostel) {
        filteredData = filteredData.filter(booking => booking.hostel === assignedHostel);
        console.log(`🔒 Filtered to ${assignedHostel}: ${filteredData.length} entries`);
      }
      
      setPending(filteredData);
      
      // Recalculate stats based on filtered data
      const filteredStats = {
        total: filteredData.length,
        totalAmount: filteredData.reduce((sum, b) => sum + (b.balanceAmount || 0), 0)
      };
      
      setStats(filteredStats);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching department payments:", error);
      setLoading(false);
    }
  };

  const openPaymentModal = (booking) => {
    setPaymentModal(booking);
  };

  // ✅ ACCESS DENIED FOR GUESTS
  if (!canAccessPage) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to view department payments.
          </p>
          <button
            onClick={onBack}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading department payments...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50"}`}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Department Payments Pending
            {/* ✅ SHOW HOSTEL FILTER FOR RESTRICTED ROLES */}
            {isRestrictedRole && assignedHostel && (
              <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                - {assignedHostel}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isRestrictedRole 
              ? `Showing ${assignedHostel} department payments only`
              : "These payments are awaiting department clearance - NOT defaulters"}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Pending</p>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mt-2">{stats.total}</p>
            </div>
            <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 p-6 rounded-xl border-2 border-orange-200 dark:border-orange-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Amount Due</p>
              <p className="text-4xl font-bold text-orange-900 dark:text-orange-100 mt-2">
                ₹{stats.totalAmount.toLocaleString()}
              </p>
            </div>
            <IndianRupee className="w-12 h-12 text-orange-600 dark:text-orange-400" />
          </div>
        </motion.div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Guest Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Checkout Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Days Pending
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="w-12 h-12 text-gray-300" />
                      <p>No pending department payments</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pending.map((booking) => {
                  const daysPending = Math.floor(
                    (Date.now() - new Date(booking.checkedOutAt)) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <motion.tr
                      key={booking._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {booking.guest}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{booking.email}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{booking.contact}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{booking.hostel}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Room {booking.roomNo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(booking.checkedOutAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          ₹{booking.balanceAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          daysPending > 7 
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}>
                          {daysPending} days
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openPaymentModal(booking)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                        >
                          Mark Paid
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          booking={{
            ...paymentModal,
            _id: paymentModal._id,
            totalAmount: paymentModal.balanceAmount,
            paidAmount: 0,
            balanceAmount: paymentModal.balanceAmount,
          }}
          onClose={() => setPaymentModal(null)}
          onSuccess={() => {
            setPaymentModal(null);
            fetchPendingPayments(); // Refresh list
          }}
        />
      )}
    </div>
  );
}