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
    console.log("🔍 Opening payment modal for booking:", {
      _id: booking._id,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      balanceAmount: booking.balanceAmount,
      discount: booking.discount
    });
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
      <div className={`fixed inset-0 ml-64 mt-16 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Loading department payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ml-64 mt-16 bg-gradient-to-br ${theme === 'dark' ? 'bg-gray-900' : 'from-blue-50 to-purple-50'} overflow-y-auto`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl rounded-3xl mx-6 mt-6">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Building2 size={32} />
                  Department Payments Pending
                  {/* ✅ SHOW HOSTEL FILTER FOR RESTRICTED ROLES */}
                  {isRestrictedRole && assignedHostel && (
                    <span className="text-lg font-normal text-blue-100">
                      - {assignedHostel}
                    </span>
                  )}
                </h1>
                <p className="text-blue-100 mt-1">
                  {isRestrictedRole 
                    ? `Showing ${assignedHostel} department payments only`
                    : "These payments are awaiting department clearance - NOT defaulters"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 border-l-4 border-blue-500`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Pending</p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.total}</p>
              </div>
              <Clock className="w-12 h-12 text-blue-500 dark:text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 border-l-4 border-orange-500`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Amount Due</p>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  ₹{stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <IndianRupee className="w-12 h-12 text-orange-500 dark:text-orange-400" />
            </div>
          </motion.div>
        </div>

        {/* Table */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
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
              <tbody className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} divide-y divide-gray-200 dark:divide-gray-700`}>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No pending department payments</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">All payments have been cleared</p>
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
                          <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{booking.hostel}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Room {booking.roomNo}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(booking.checkedOutAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
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
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg"
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
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          booking={{
            ...paymentModal,
            _id: paymentModal._id,
            // ✅ CRITICAL FIX: Use actual booking amounts from the database
            totalAmount: paymentModal.totalAmount || paymentModal.balanceAmount,
            paidAmount: paymentModal.paidAmount || 0,
            balanceAmount: paymentModal.balanceAmount,
            discount: paymentModal.discount || 0,
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