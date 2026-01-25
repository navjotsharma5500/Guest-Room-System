import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Search, Filter, AlertCircle, CreditCard, 
  User, Phone, Mail, Calendar, Building2, ChevronLeft,
  ChevronRight, FileText, Clock, TrendingUp, Ban,
  CheckCircle, Receipt, History, DollarSign, ArrowLeft, Upload
} from 'lucide-react';
import { BACKEND_URL } from '../utils/apiConfig';

const API = BACKEND_URL;

const DefaulterManagement = ({ currentUser, onBack, onOpenPaymentModal }) => {
  const [defaulters, setDefaulters] = useState([]);
  const [filteredDefaulters, setFilteredDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostel, setSelectedHostel] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDefaulter, setSelectedDefaulter] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackAmount, setRollbackAmount] = useState(0);
  const [rollbackRemarks, setRollbackRemarks] = useState('');
  const [rollbackAttachments, setRollbackAttachments] = useState([]);
  const [uploadingRollback, setUploadingRollback] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  
  const [error, setError] = useState(null);
  const ikRollbackUploadRef = useRef(null);
  const itemsPerPage = 10;

  const role = currentUser?.role || "caretaker";
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel;

  const canRollback = role === "admin" || role === "manager";

  useEffect(() => {
    fetchDefaulters();
  }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && onBack) {
        onBack();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onBack]);

  const fetchDefaulters = async () => {
    try {
      setLoading(true);
      console.log("🔍 Fetching from:", `${API}/api/defaulters`);
      
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API}/api/defaulters`, {
        method: "GET",
        credentials: "include",
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ Defaulters fetched:", data);

      if (data.success && Array.isArray(data.defaulters)) {
        const normalized = data.defaulters
          .map(d => {
            const totalAmount = Number(d.totalAmount || 0);
            const paidAmount = Number(d.paidAmount || 0);
            const discount = Number(d.discount || d.waveOff || 0);
            const totalRolledBack = Array.isArray(d.paymentRollbacks) 
              ? d.paymentRollbacks.reduce((sum, r) => sum + (r.amount || 0), 0)
              : 0;
            
            // ✅ CORRECT CALCULATION: Total - Paid - Discount
            const actualBalance = totalAmount - paidAmount - discount;
            
            return {
              ...d,
              department: d.department || "",
              rollno: d.rollno || "",
              bills: Array.isArray(d.bills) ? d.bills : [],
              paidAmount: paidAmount,
              totalAmount: totalAmount,
              discount: discount,
              totalDue: actualBalance, // ✅ Use calculated balance
              totalRolledBack: totalRolledBack,
              paymentRollbacks: Array.isArray(d.paymentRollbacks) ? d.paymentRollbacks : []
            };
          })
          .filter(d => {
            const checkoutDate = new Date(d.checkoutDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            checkoutDate.setHours(0, 0, 0, 0);
            
            const hasCheckoutPassed = checkoutDate < today;
            const isCheckoutStatus = d.status === 'checked_out' || hasCheckoutPassed;
            
            // ✅ Include all: pending, completed, and those with rollbacks
            return isCheckoutStatus;
          });

        setDefaulters(normalized);
        setFilteredDefaulters(normalized);
        console.log(`📊 Found ${normalized.length} real defaulters`);
      } else {
        console.error('❌ Invalid API response:', data);
        setDefaulters([]);
        setFilteredDefaulters([]);
      }
    } catch (err) {
      console.error('❌ Failed to fetch defaulters:', err);
      setError(err.message || 'Failed to fetch defaulters');
      setDefaulters([]);
      setFilteredDefaulters([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ TAB FILTERING LOGIC
  useEffect(() => {
    let filtered = [...defaulters];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.guest.toLowerCase().includes(query) ||
        d.email.toLowerCase().includes(query) ||
        d.contact.includes(query) ||
        d.rollno.toLowerCase().includes(query)
      );
    }

    // Hostel filter
    if (selectedHostel !== 'All') {
      filtered = filtered.filter(d => d.hostel === selectedHostel);
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(d => {
        const checkoutDate = new Date(d.checkoutDate);
        checkoutDate.setHours(0, 0, 0, 0);
        return checkoutDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(d => {
        const checkoutDate = new Date(d.checkoutDate);
        return checkoutDate <= toDate;
      });
    }

    // ✅ TAB FILTERING
    if (activeTab === 'pending') {
      filtered = filtered.filter(d => {
        const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
        // Show in pending if: has balance AND no rollbacks
        return d.totalDue > 0 && !hasRollbacks;
      });
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(d => {
        const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
        // Show in completed if: fully paid (0 balance) AND no rollbacks
        return d.totalDue === 0 && !hasRollbacks;
      });
    } else if (activeTab === 'rollbacks') {
      filtered = filtered.filter(d => 
        // Show in rollbacks if: has any rollback history
        d.paymentRollbacks && d.paymentRollbacks.length > 0
      );
    }

    setFilteredDefaulters(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedHostel, dateFrom, dateTo, activeTab, defaulters]);

  const totalPages = Math.ceil(filteredDefaulters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDefaulters = filteredDefaulters.slice(startIndex, startIndex + itemsPerPage);

  const hostels = ['All', ...new Set(defaulters.map(d => d.hostel))];

  const pendingDefaulters = defaulters.filter(d => {
    const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
    return d.totalDue > 0 && !hasRollbacks;
  });
  
  const completedPayments = defaulters.filter(d => {
    const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
    return d.totalDue === 0 && d.paidAmount > 0 && !hasRollbacks;
  });
  
  const rollbackCount = defaulters.filter(d => d.paymentRollbacks && d.paymentRollbacks.length > 0).length;

  const totalOutstanding = pendingDefaulters.reduce((sum, d) => sum + d.totalDue, 0);
  const avgDaysOverdue = pendingDefaulters.length > 0 
    ? Math.round(pendingDefaulters.reduce((sum, d) => sum + d.daysOverdue, 0) / pendingDefaulters.length)
    : 0;
  const criticalCount = pendingDefaulters.filter(d => d.daysOverdue > 30).length;

  const handleBackClick = () => {
    if (onBack && typeof onBack === 'function') {
      onBack();
    } else {
      window.history.go(-2);
    }
  };

  const handleDownload = () => {
    const headers = [
      'Guest Name', 'Email', 'Contact', 'Hostel', 'Room', 'Department', 'Roll No',
      'Total Amount', 'Paid Amount', 'Discount', 'Balance Due', 'Days Overdue',
      'Last Booking', 'Checkout Date', 'Status',
      'Payment Mode', 'Transaction ID', 'Transaction Date',
      'Rollback Count', 'Total Rolled Back', 'Rollback Details'
    ];
    
    let dataToDownload = filteredDefaulters;
    if (role === 'caretaker' && assignedHostel) {
      dataToDownload = dataToDownload.filter(d => d.hostel === assignedHostel);
    }

    const csvContent = [
      headers.join(','),
      ...dataToDownload.map(d => {
        const rollbacks = d.paymentRollbacks || [];
        const totalRolledBack = rollbacks.reduce((sum, r) => sum + (r.amount || 0), 0);
        const rollbackDetails = rollbacks.map(r => 
          `₹${r.amount} on ${new Date(r.rollbackDate).toLocaleDateString()} - ${r.remarks}`
        ).join(' | ');

        return [
          `"${d.guest}"`,
          `"${d.email}"`,
          d.contact,
          `"${d.hostel}"`,
          d.roomNo,
          `"${d.department}"`,
          d.rollno,
          d.totalAmount || 0,
          d.paidAmount || 0,
          d.discount || 0,
          d.totalDue,
          d.daysOverdue,
          new Date(d.lastBooking).toLocaleDateString(),
          new Date(d.checkoutDate).toLocaleDateString(),
          d.status,
          `"${d.paymentMode || 'N/A'}"`,
          `"${d.transactionId || 'N/A'}"`,
          d.transactionDate ? new Date(d.transactionDate).toLocaleDateString() : 'N/A',
          rollbacks.length,
          totalRolledBack,
          `"${rollbackDetails || 'None'}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defaulters_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (days) => {
    if (days > 30) return 'bg-red-100 text-red-700 border-red-300';
    if (days > 15) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingRollback(true);
      setTimeout(() => {
        const mockUrl = `https://example.com/uploads/${file.name}`;
        setRollbackAttachments(prev => [...prev, mockUrl]);
        setUploadingRollback(false);
      }, 1500);
    }
  };

  const handleRollbackPayment = async () => {
    if (!selectedDefaulter) return;

    if (!rollbackAmount || rollbackAmount <= 0) {
      alert("⚠️ Please enter a valid rollback amount");
      return;
    }

    if (rollbackAmount > selectedDefaulter.paidAmount) {
      alert(`⚠️ Cannot rollback ₹${rollbackAmount}. Only ₹${selectedDefaulter.paidAmount} has been paid.`);
      return;
    }

    if (!rollbackRemarks.trim()) {
      alert("⚠️ Remarks are mandatory for rollback");
      return;
    }

    if (rollbackAttachments.length === 0) {
      alert("⚠️ At least one attachment is required for rollback");
      return;
    }

    setConfirmAction({
      title: "Confirm Rollback",
      message: `Are you sure you want to rollback ₹${rollbackAmount}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem("token");
          const headers = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const response = await fetch(`${API}/api/defaulters/${selectedDefaulter._id}/rollback`, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({
              amount: Number(rollbackAmount),
              remarks: rollbackRemarks.trim(),
              attachments: rollbackAttachments
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to rollback payment");
          }

          const result = await response.json();
          console.log("✅ Payment rolled back:", result);

          alert(`✅ ₹${rollbackAmount} rolled back successfully!`);

          setShowRollbackModal(false);
          setRollbackAmount(0);
          setRollbackRemarks('');
          setRollbackAttachments([]);
          setShowDetails(false);
          setConfirmAction(null);
          
          await fetchDefaulters();

        } catch (err) {
          console.error("❌ Rollback error:", err);
          alert(`❌ Failed to rollback payment: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 ml-64 mt-16 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-gray-900 via-red-900 to-black text-white shadow-2xl rounded-3xl mx-6 mt-6 overflow-hidden border border-red-500/30">
        <div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 via-transparent to-orange-500/10 backdrop-blur-xl"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackClick}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Defaulter Management</h1>
                  <p className="text-red-100 mt-1">Outstanding Payment Tracking System</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 transition shadow-lg"
            >
              <Download size={20} />
              Download Report
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <motion.div 
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-xs text-gray-300">Total Outstanding</p>
                  <p className="text-2xl font-bold text-yellow-400">₹{totalOutstanding}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-300">Total Defaulters</p>
                  <p className="text-2xl font-bold text-blue-400">{defaulters.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-xs text-gray-300">Avg Days Overdue</p>
                  <p className="text-2xl font-bold text-orange-400">{avgDaysOverdue}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <Ban className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-xs text-gray-300">Critical (30+ days)</p>
                  <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white shadow-lg border-2 border-gray-200 rounded-2xl mx-6 mt-4">
        <div className="px-6 py-4">
          <div className="flex gap-4 items-center flex-wrap">
            {/* Date Range Filter */}
            <div className="flex gap-2 items-center">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="mt-5 px-3 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition text-sm font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, contact, or roll number..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Hostel Filter */}
            {(role === 'admin' || role === 'manager') && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedHostel}
                  onChange={(e) => setSelectedHostel(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none bg-white"
                >
                  {hostels.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs Section */}
      <div className="mx-6 mt-4">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertCircle size={20} />
                <span>Pending Payments</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === 'pending' ? 'bg-white/20' : 'bg-red-100 text-red-700'
                }`}>
                  {pendingDefaulters.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                activeTab === 'completed'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle size={20} />
                <span>Completed</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === 'completed' ? 'bg-white/20' : 'bg-green-100 text-green-700'
                }`}>
                  {completedPayments.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('rollbacks')}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                activeTab === 'rollbacks'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <History size={20} />
                <span>Rollbacks</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === 'rollbacks' ? 'bg-white/20' : 'bg-orange-100 text-orange-700'
                }`}>
                  {rollbackCount}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Defaulters List */}
      <div className="mx-6 my-6">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
              <p className="text-gray-600">Loading defaulters...</p>
            </div>
          </div>
        ) : filteredDefaulters.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-700">No Defaulters Found!</h3>
            <p className="text-sm text-green-600 mt-2">All guests have cleared their payments ✓</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedDefaulters.map((defaulter) => (
                <motion.div
                  key={defaulter._id}
                  className="relative bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Animated border gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '2px' }}>
                    <div className="h-full w-full bg-white rounded-2xl"></div>
                  </div>
                  
                  {/* Border */}
                  <div className="absolute inset-0 border-2 border-red-500/30 group-hover:border-red-500 rounded-2xl transition-all duration-300"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 p-6 bg-gradient-to-br from-white/95 via-gray-50/95 to-white/95 backdrop-blur-sm rounded-2xl">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="relative">
                          <div className="bg-gradient-to-br from-gray-600 to-gray-800 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg flex-shrink-0 border-2 border-red-500">
                            {defaulter.guest.charAt(0)}
                          </div>
                          {/* Payment Status Flag */}
                          <div 
                            className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                              defaulter.totalDue === 0 
                                ? 'bg-green-500' 
                                : defaulter.paidAmount > 0 
                                  ? 'bg-orange-500' 
                                  : 'bg-red-500'
                            }`} 
                            title={
                              defaulter.totalDue === 0 
                                ? 'Fully Paid' 
                                : defaulter.paidAmount > 0 
                                  ? `Partial: ₹${defaulter.paidAmount} paid` 
                                  : 'No Payment'
                            }
                          >
                            {defaulter.totalDue === 0 && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 truncate">{defaulter.guest}</h3>
                          <p className="text-sm text-gray-600 truncate">{defaulter.department} • {defaulter.rollno}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-gray-500">Email</p>
                          <p className="font-semibold text-gray-900 truncate">{defaulter.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Contact</p>
                          <p className="font-semibold text-gray-900">{defaulter.contact}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Hostel</p>
                          <p className="font-semibold text-gray-900 truncate">{defaulter.hostel} - {defaulter.roomNo}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Last Booking</p>
                          <p className="font-semibold text-gray-900">{new Date(defaulter.lastBooking).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Outstanding</p>
                        <div className="relative inline-block">
                          <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                          <p className="relative text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 drop-shadow-lg">
                            ₹{defaulter.totalDue}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2 rounded-full border-2 border-red-300 mt-3 shadow-sm">
                          <Clock className="w-4 h-4 text-red-600 animate-pulse" />
                          <span className="text-sm font-bold text-red-700">{defaulter.daysOverdue} days</span>
                        </div>
                      </div>

                      <motion.button
                        onClick={() => {
                          setSelectedDefaulter(defaulter);
                          setShowDetails(true);
                        }}
                        className="relative overflow-hidden bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl flex items-center gap-3 group"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <FileText size={20} className="relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                        <span className="relative z-10">View Details</span>
                      </motion.button>
                    </div>
                  </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white rounded-xl shadow-md p-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredDefaulters.length)} of {filteredDefaulters.length} defaulters
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg font-semibold transition ${
                              currentPage === page
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal - Keep as is */}
      <AnimatePresence>
        {showDetails && selectedDefaulter && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-red-500"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{selectedDefaulter.guest}</h3>
                      <p className="text-red-100">Outstanding Payment Details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Guest Details */}
                <div className="bg-gray-50 rounded-2xl p-5 border-2 border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Guest Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Email</p>
                      <p className="font-semibold text-gray-900">{selectedDefaulter.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Contact</p>
                      <p className="font-semibold text-gray-900">{selectedDefaulter.contact}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Department</p>
                      <p className="font-semibold text-gray-900">{selectedDefaulter.department}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Roll Number</p>
                      <p className="font-semibold text-gray-900">{selectedDefaulter.rollno}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Hostel</p>
                      <p className="font-semibold text-gray-900">{selectedDefaulter.hostel}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Room</p>
                      <p className="font-semibold text-gray-900">{selectedDefaulter.roomNo}</p>
                    </div>
                  </div>
                </div>

                {/* Bill Details */}
                <div className="bg-red-50 rounded-2xl p-5 border-2 border-red-200">
                  <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Unpaid Bills
                  </h4>
                  <div className="space-y-3">
                    {selectedDefaulter.bills.map((bill, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 border border-red-300 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{bill.billNumber}</p>
                          <p className="text-xs text-gray-600">Date: {new Date(bill.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-700">₹{bill.amount}</p>
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            {bill.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t-2 border-red-300 flex justify-between items-center">
                    <span className="font-bold text-gray-800">Total Outstanding</span>
                    <span className="text-3xl font-bold text-red-700">
                      ₹{(() => {
                        const totalAmount = selectedDefaulter.totalAmount || 0;
                        const paidAmount = selectedDefaulter.paidAmount || 0;
                        const discount = selectedDefaulter.discount || selectedDefaulter.waveOff || 0;
                        return totalAmount - paidAmount - discount;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Rollback History */}
                {selectedDefaulter.paymentRollbacks && selectedDefaulter.paymentRollbacks.length > 0 && (
                  <div className="bg-orange-50 rounded-2xl p-5 border-2 border-orange-200">
                    <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Payment Rollback History ({selectedDefaulter.paymentRollbacks.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedDefaulter.paymentRollbacks.map((rollback, index) => (
                        <div key={index} className="bg-white rounded-xl p-4 border border-orange-300">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-900">Rollback #{selectedDefaulter.paymentRollbacks.length - index}</p>
                              <p className="text-xs text-gray-600">
                                Date: {new Date(rollback.rollbackDate).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-600">
                                By: {rollback.rolledBackBy?.name || 'System'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-orange-700">₹{rollback.amount}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-orange-200">
                            <p className="text-xs text-gray-600 font-semibold mb-1">Remarks:</p>
                            <p className="text-sm text-gray-800">{rollback.remarks}</p>
                          </div>
                          {rollback.attachments && rollback.attachments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-orange-200">
                              <p className="text-xs text-gray-600 font-semibold mb-1">Attachments:</p>
                              <div className="flex flex-wrap gap-2">
                                {rollback.attachments.map((att, i) => (
                                  <a
                                    key={i}
                                    href={att}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <FileText size={12} />
                                    File {i + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t-2 border-orange-300 flex justify-between items-center">
                      <span className="font-bold text-gray-800">Total Rolled Back</span>
                      <span className="text-2xl font-bold text-orange-700">
                        ₹{selectedDefaulter.paymentRollbacks.reduce((sum, r) => sum + (r.amount || 0), 0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {(() => {
                    const hasRollbacks = selectedDefaulter.paymentRollbacks && selectedDefaulter.paymentRollbacks.length > 0;
                    const totalAmount = selectedDefaulter.totalAmount || 0;
                    const paidAmount = selectedDefaulter.paidAmount || 0;
                    const discount = selectedDefaulter.discount || selectedDefaulter.waveOff || 0;
                    const currentBalance = totalAmount - paidAmount - discount;
                    const isFullyPaid = currentBalance === 0 && paidAmount > 0;

                    // ✅ CASE 1: Has Rollbacks - Show ONLY close button
                    if (hasRollbacks) {
                      return (
                        <button
                          onClick={() => setShowDetails(false)}
                          className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                        >
                          Close
                        </button>
                      );
                    }

                    // ✅ CASE 2: Fully Paid (no rollbacks) - Show ONLY fully paid badge + close
                    if (isFullyPaid) {
                      return (
                        <>
                          <div className="flex-1 bg-green-100 text-green-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-green-500">
                            <CheckCircle size={20} />
                            Fully Paid
                          </div>
                          <button
                            onClick={() => setShowDetails(false)}
                            className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                          >
                            Close
                          </button>
                        </>
                      );
                    }

                    // ✅ CASE 3: Pending/Partial Payment - Show Pay + Rollback + Close
                    return (
                      <>
                        <button
                          onClick={() => {
                            setShowDetails(false);
                            const bookingData = {
                              _id: selectedDefaulter._id,
                              bookingId: selectedDefaulter._id,
                              guest: selectedDefaulter.guest,
                              email: selectedDefaulter.email,
                              contact: selectedDefaulter.contact,
                              hostel: selectedDefaulter.hostel,
                              roomNo: selectedDefaulter.roomNo,
                              department: selectedDefaulter.department,
                              rollno: selectedDefaulter.rollno,
                              totalAmount: totalAmount,
                              paidAmount: paidAmount,
                              discount: discount,
                              balanceAmount: currentBalance,
                              totalDue: currentBalance,
                              bills: selectedDefaulter.bills,
                              daysOverdue: selectedDefaulter.daysOverdue,
                              lastBooking: selectedDefaulter.lastBooking
                            };
                            onOpenPaymentModal?.(bookingData);
                          }}
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:from-green-700 hover:to-green-800 transition"
                        >
                          <CreditCard size={20} />
                          Pay ₹{currentBalance} Now
                        </button>

                        {canRollback && paidAmount > 0 && (
                          <button
                            onClick={() => {
                              setShowDetails(false);
                              setShowRollbackModal(true);
                            }}
                            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:from-orange-700 hover:to-red-700 transition"
                          >
                            <AlertCircle size={20} />
                            Rollback Payment
                          </button>
                        )}

                        <button
                          onClick={() => setShowDetails(false)}
                          className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                        >
                          Close
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rollback Payment Modal - Keep as is */}
      <AnimatePresence>
        {showRollbackModal && selectedDefaulter && canRollback && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRollbackModal(false)}
          >
            <motion.div
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Rollback Payment</h3>
                      <p className="text-white/90 text-sm">{selectedDefaulter.guest}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRollbackModal(false)}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Total Amount</p>
                      <p className="font-bold text-gray-900">₹{selectedDefaulter.totalAmount || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Paid Amount</p>
                      <p className="font-bold text-green-600">₹{selectedDefaulter.paidAmount || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current Balance</p>
                      <p className="font-bold text-red-600">₹{selectedDefaulter.totalDue}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Max Rollback</p>
                      <p className="font-bold text-orange-600">₹{selectedDefaulter.paidAmount || 0}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">
                    Rollback Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={rollbackAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // ✅ Allow empty string for clearing
                      if (value === '') {
                        setRollbackAmount(0);
                        return;
                      }
                      // ✅ Convert to number and cap at max paid amount
                      const numValue = Number(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setRollbackAmount(Math.min(numValue, selectedDefaulter.paidAmount || 0));
                      }
                    }}
                    min="0"
                    max={selectedDefaulter.paidAmount || 0}
                    step="1"
                    placeholder="Enter amount to rollback"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: ₹{selectedDefaulter.paidAmount || 0}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">
                    Remarks <span className="text-red-500">* (Mandatory)</span>
                  </label>
                  <textarea
                    value={rollbackRemarks}
                    onChange={(e) => setRollbackRemarks(e.target.value)}
                    placeholder="Enter reason for rollback (mandatory)..."
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 h-24 resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">
                    Upload Proof <span className="text-red-500">* (Mandatory)</span>
                  </label>
                  
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="rollback-upload"
                    accept="image/*,.pdf"
                  />
                  
                  <label
                    htmlFor="rollback-upload"
                    className="w-full border-2 border-dashed border-gray-400 rounded-xl p-4 hover:border-orange-500 hover:bg-orange-50 transition text-center cursor-pointer block"
                  >
                    {uploadingRollback ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload proof</p>
                      </div>
                    )}
                  </label>

                  {rollbackAttachments.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-green-700 mb-2">
                        ✅ Uploaded: {rollbackAttachments.length}
                      </p>
                      <ul className="space-y-1">
                        {rollbackAttachments.map((url, i) => (
                          <li key={i} className="flex items-center justify-between bg-white p-2 rounded">
                            <span className="text-xs text-blue-600 truncate flex-1">File {i + 1}</span>
                            <button
                              onClick={() => setRollbackAttachments(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {confirmAction && (
                    <motion.div
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                      >
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {confirmAction.title}
                        </h3>

                        <p className="text-gray-600 mb-6">
                          {confirmAction.message}
                        </p>

                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              confirmAction.onConfirm();
                              setConfirmAction(null);
                            }}
                            className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition"
                          >
                            Yes, Continue
                          </button>

                          <button
                            onClick={() => setConfirmAction(null)}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {rollbackAmount > 0 && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-orange-800 mb-2">After Rollback:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">New Paid Amount</p>
                        <p className="font-bold text-green-700">
                          ₹{(selectedDefaulter.paidAmount || 0) - rollbackAmount}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">New Balance</p>
                        <p className="font-bold text-red-700">
                          ₹{(selectedDefaulter.totalAmount || 0) - ((selectedDefaulter.paidAmount || 0) - rollbackAmount) - (selectedDefaulter.discount || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleRollbackPayment}
                    disabled={loading || !rollbackAmount || !rollbackRemarks.trim() || rollbackAttachments.length === 0}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-700 hover:to-red-700 transition"
                  >
                    {loading ? "Processing..." : `Rollback ₹${rollbackAmount}`}
                  </button>
                  <button
                    onClick={() => setShowRollbackModal(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DefaulterManagement;