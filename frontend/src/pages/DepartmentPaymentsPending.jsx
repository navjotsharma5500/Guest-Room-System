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
  
  // ✅ Check permissions
  const hasGuestRoomPermission = currentUser?.permissions?.guestRoom === true;
  
  // Restricted ONLY if role is restricted AND no override permission
  const isRestrictedRole = (role === 'caretaker' || role === 'warden') && !hasGuestRoomPermission;
  
  const canAccessPage = ['admin', 'manager', 'caretaker', 'warden'].includes(role) || hasGuestRoomPermission;

  useEffect(() => {
    if (canAccessPage) {
      fetchPendingPayments();
    }
  }, [canAccessPage]);

  // ✅ ADD THIS ENTIRE BLOCK HERE:
  // Listen for real-time checkout events (manual + cron)
  useEffect(() => {
    if (!canAccessPage) return;

    const handleGuestCheckedOut = (event) => {
      const data = event.detail || {};
      console.log("📡 Guest checked out event received:", data);
      
      // Refresh if it's a department payment
      if (data.paymentResponsibility === "DEPARTMENT" || data.source === 'cron-auto-checkout') {
        console.log("🔄 Refreshing department payments list...");
        setTimeout(() => fetchPendingPayments(), 1000); // Small delay to ensure DB is updated
      }
    };

    const handleBookingDataUpdated = (event) => {
      const data = event.detail || {};
      console.log("📡 Booking data updated event received:", data);
      
      // Refresh if it's an auto-checkout event
      if (data.type === 'cron-auto-checkout') {
        console.log("🔄 Cron auto-checkout detected - refreshing...");
        setTimeout(() => fetchPendingPayments(), 1000);
      }
    };

    // Listen to both events
    window.addEventListener('guestCheckedOut', handleGuestCheckedOut);
    window.addEventListener('bookingDataUpdated', handleBookingDataUpdated);

    return () => {
      window.removeEventListener('guestCheckedOut', handleGuestCheckedOut);
      window.removeEventListener('bookingDataUpdated', handleBookingDataUpdated);
    };
  }, [canAccessPage]);

  const fetchPendingPayments = async () => {
    try {
      const { data } = await axios.get(`${API}/api/department-payments`, {
        withCredentials: true
      });
      
      // ✅ CLIENT-SIDE FILTERING (backup - backend should already filter)
      let filteredData = data.data || [];
      
      if (isRestrictedRole && assignedHostel) {
        filteredData = filteredData.filter(booking => booking.hostel === assignedHostel);
        console.log(`ðŸ”’ Filtered to ${assignedHostel}: ${filteredData.length} entries`);
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
    console.log("ðŸ” Opening payment modal for booking:", {
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
      <div className={`min-h-screen flex items-center justify-center p-4 md:ml-64 md:mt-16 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="text-center p-4 sm:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-xs sm:max-w-md">
          <ShieldAlert className="w-12 h-12 sm:w-16 sm:h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to view department payments.
          </p>
          <button
            onClick={onBack}
            className="bg-red-600 text-white px-4 sm:px-6 py-2 text-sm sm:text-base rounded-lg hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-2 border-blue-600"></div>
          <p className={`text-xs sm:text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Loading department payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen bg-gradient-to-br ${theme === 'dark' ? 'bg-gray-900' : 'from-blue-50 to-purple-50'} overflow-y-auto`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl rounded-2xl md:rounded-3xl mx-3 sm:mx-6 mt-4 sm:mt-6">
        <div className="px-3 sm:px-6 py-4 sm:py-6">
          <div className="flex items-start gap-2 sm:gap-4 flex-col sm:flex-row">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-lg transition flex-shrink-0"
            >
              <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold flex items-center gap-1 sm:gap-2 flex-wrap">
                <Building2 size={20} className="sm:w-8 sm:h-8" />
                <span>Dept Payments</span>
                  {/* ✅ SHOW HOSTEL FILTER FOR RESTRICTED ROLES */}
                  {isRestrictedRole && assignedHostel && (
                    <span className="text-xs sm:text-base md:text-lg font-normal text-blue-100 ml-1">
                      - {assignedHostel}
                    </span>
                  )}
              </h1>
              <p className="text-blue-100 mt-1 text-xs sm:text-sm">
                {isRestrictedRole 
                  ? `Showing ${assignedHostel} payments only`
                  : "Awaiting department clearance - NOT defaulters"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-3 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg sm:rounded-xl shadow-md p-3 sm:p-6 border-l-4 border-blue-500`}
          >
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Total Pending</p>
                <p className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mt-1 sm:mt-2">{stats.total}</p>
              </div>
              <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg sm:rounded-xl shadow-md p-3 sm:p-6 border-l-4 border-orange-500`}
          >
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Amount Due</p>
                <p className="text-2xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400 mt-1 sm:mt-2 truncate">
                  ₹{stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 sm:w-12 sm:h-12 text-orange-500 dark:text-orange-400 flex-shrink-0" />
            </div>
          </motion.div>
        </div>

        {/* Desktop Table View - Hidden on Mobile */}
        <div className="hidden sm:block">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg sm:rounded-xl shadow-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Guest Details
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Checkout Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Days Pending
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} divide-y divide-gray-200 dark:divide-gray-700`}>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Building2 className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-lg font-medium">No pending payments</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">All payments cleared</p>
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
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                            {booking.guest}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{booking.email}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{booking.contact}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 font-medium">{booking.hostel}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Room {booking.roomNo}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {new Date(booking.checkedOutAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">
                            ₹{booking.balanceAmount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${
                            daysPending > 7 
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}>
                            {daysPending} days
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                          <button
                            onClick={() => {
                              console.log("Collecting payment for:", booking._id);
                              openPaymentModal(booking);
                            }}
                            className="bg-blue-600 text-white px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg whitespace-nowrap"
                          >
                            Pay
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

        {/* Mobile Card View - Hidden on Desktop */}
        <div className="sm:hidden">
          {pending.length === 0 ? (
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 text-center`}>
              <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-1">No pending payments</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs">All payments cleared</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((booking) => {
                const daysPending = Math.floor(
                  (Date.now() - new Date(booking.checkedOutAt)) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <motion.div
                    key={booking._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 border-l-4 border-blue-500`}
                  >
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{booking.guest}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{booking.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{booking.contact}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Location</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{booking.hostel}</p>
                        <p className="text-gray-600 dark:text-gray-400">Room {booking.roomNo}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Checkout</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(booking.checkedOutAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 pb-3 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Amount Due</p>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          ₹{booking.balanceAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Pending</p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full inline-block ${
                          daysPending > 7 
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}>
                          {daysPending} days
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        console.log("Collecting payment for:", booking._id);
                        openPaymentModal(booking);
                      }}
                      className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                    >
                      Collect Payment
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          booking={{
            ...paymentModal,
            _id: paymentModal._id,
            // Pass complete payment data
            totalAmount: paymentModal.totalAmount,
            paidAmount: paymentModal.paidAmount || 0,
            balanceAmount: paymentModal.balanceAmount,
            discount: paymentModal.discount || 0,
            paymentResponsibility: "DEPARTMENT", // ✅ Mark as department payment
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