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
  
  const [error, setError] = useState(null);
  const ikRollbackUploadRef = useRef(null);
  const itemsPerPage = 10;

  const role = currentUser?.role || "caretaker";
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel;

  // ✅ Rollback permission (single source of truth)
  const canRollback = role === "admin" || role === "manager";

  // ✅ FETCH REAL DEFAULTERS FROM BACKEND
  useEffect(() => {
    fetchDefaulters();
  }, []);

  // ✅ ADD ESC KEY HANDLER
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        handleBackClick();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

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
        const normalized = data.defaulters.map(d => ({
          ...d,
          department: d.department || "",
          rollno: d.rollno || "",
          bills: Array.isArray(d.bills) ? d.bills : [],
          paidAmount: Number(d.paidAmount || 0),
          totalAmount: Number(d.totalAmount || 0),
          totalDue: Number(d.totalDue || 0),
          paymentRollbacks: Array.isArray(d.paymentRollbacks) ? d.paymentRollbacks : []
        }));

        setDefaulters(normalized);
        setFilteredDefaulters(normalized);
        console.log(`📊 Found ${normalized.length} defaulters`);
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

  // Filter and search
  useEffect(() => {
    let filtered = [...defaulters];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.guest.toLowerCase().includes(query) ||
        d.email.toLowerCase().includes(query) ||
        d.contact.includes(query) ||
        d.rollno.toLowerCase().includes(query)
      );
    }

    if (selectedHostel !== 'All') {
      filtered = filtered.filter(d => d.hostel === selectedHostel);
    }

    setFilteredDefaulters(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedHostel, defaulters]);

  // Pagination
  const totalPages = Math.ceil(filteredDefaulters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDefaulters = filteredDefaulters.slice(startIndex, startIndex + itemsPerPage);

  // Get unique hostels for filter
  const hostels = ['All', ...new Set(defaulters.map(d => d.hostel))];

  // Calculate stats
  const totalOutstanding = defaulters.reduce((sum, d) => sum + d.totalDue, 0);
  const avgDaysOverdue = defaulters.length > 0 
    ? Math.round(defaulters.reduce((sum, d) => sum + d.daysOverdue, 0) / defaulters.length)
    : 0;
  const criticalCount = defaulters.filter(d => d.daysOverdue > 30).length;

  // ✅ FIX: Proper back navigation
  const handleBackClick = () => {
    if (onBack && typeof onBack === 'function') {
      onBack();
    } else {
      // Fallback: Navigate to dashboard/home
      window.history.go(-2); // Go back 2 steps to skip DoSA Office
      // OR use: window.location.href = '/dashboard';
    }
  };

  // Download CSV
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

  // Get severity color
  const getSeverityColor = (days) => {
    if (days > 30) return 'bg-red-100 text-red-700 border-red-300';
    if (days > 15) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  };

  // Mock file upload handler
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

  // Rollback payment handler
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

    if (!window.confirm(`Are you sure you want to rollback ₹${rollbackAmount}?\n\nThis will:\n- Reduce paid amount from ₹${selectedDefaulter.paidAmount} to ₹${selectedDefaulter.paidAmount - rollbackAmount}\n- Increase balance from ₹${selectedDefaulter.totalDue} to ₹${selectedDefaulter.totalDue + rollbackAmount}`)) {
      return;
    }

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
      
      // Refresh defaulters list
      fetchDefaulters();

    } catch (err) {
      console.error("❌ Rollback error:", err);
      alert(`❌ Failed to rollback payment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen ml-64 mt-16 bg-gradient-to-br from-gray-50 to-gray-100"
    >
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white p-6 rounded-3xl shadow-2xl border-4 border-red-500 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <motion.button
                  onClick={handleBackClick}
                  className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
                  whileHover={{ scale: 1.1, x: -5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ArrowLeft size={24} />
                </motion.button>

                <motion.div 
                  className="bg-red-500 p-3 rounded-2xl shadow-lg"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <AlertCircle className="w-8 h-8" />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-bold">Defaulter Management</h2>
                  <p className="text-gray-300 text-sm">Outstanding Payment Tracking System</p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <motion.div 
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                whileHover={{ scale: 1.05, y: -5 }}
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
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                whileHover={{ scale: 1.05, y: -5 }}
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
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                whileHover={{ scale: 1.05, y: -5 }}
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
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                whileHover={{ scale: 1.05, y: -5 }}
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

          {/* Filters & Search */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border-2 border-gray-200">
            <div className="flex gap-4 items-center flex-wrap">
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

              <motion.button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg whitespace-nowrap"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download size={18} />
                Download CSV
              </motion.button>
            </div>
          </div>

          {/* Defaulters List */}
           <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                <p className="text-gray-600">Loading defaulters...</p>
              </div>
            ) : filteredDefaulters.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-green-50 rounded-2xl border-2 border-green-300">
                <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                <p className="text-xl font-bold text-green-700">No Defaulters Found!</p>
                <p className="text-sm text-green-600 mt-2">All guests have cleared their payments ✓</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[calc(100vh-480px)] overflow-y-auto pr-2">
                  {Array.isArray(paginatedDefaulters) &&
                   paginatedDefaulters.map((defaulter, index) => (
                    <motion.div
                      key={defaulter._id}
                      className={`bg-white rounded-2xl border-2 overflow-hidden shadow-md hover:shadow-xl transition-all ${getSeverityColor(defaulter.daysOverdue)}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01, x: 5 }}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="bg-gradient-to-br from-red-500 to-red-700 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-lg flex-shrink-0">
                                {defaulter.guest.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-lg font-bold text-gray-900 truncate">{defaulter.guest}</h3>
                                <p className="text-xs text-gray-600 truncate">{defaulter.department} • {defaulter.rollno}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700 truncate">{defaulter.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700">{defaulter.contact}</span>
                              </div>
                              <div className="flex items-center gap-2 min-w-0">
                                <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700 truncate">{defaulter.hostel} - Room {defaulter.roomNo}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700">{new Date(defaulter.lastBooking).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] text-gray-600 mb-0.5">Outstanding</p>
                              <p className="text-2xl font-bold text-red-700">₹{defaulter.totalDue}</p>
                            </div>

                            <div className="flex items-center gap-1.5 bg-red-100 px-2.5 py-1 rounded-full border border-red-300">
                              <Clock className="w-3 h-3 text-red-600" />
                              <span className="text-xs font-semibold text-red-700">
                                {defaulter.daysOverdue}d
                              </span>
                            </div>

                            <motion.button
                              onClick={() => {
                                setSelectedDefaulter(defaulter);
                                setShowDetails(true);
                              }}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1.5 rounded-xl font-semibold shadow-lg flex items-center gap-1.5 text-sm"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <FileText size={14} />
                              Details
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filteredDefaulters.length > itemsPerPage && (
                  <div className="mt-4 flex justify-between items-center flex-wrap gap-3">
                    <p className="text-sm text-gray-600">
                      Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDefaulters.length)} of {filteredDefaulters.length}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      <motion.button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
                      >
                        <ChevronLeft size={18} />
                      </motion.button>

                      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <motion.button
                            key={i}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${
                              currentPage === pageNum
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            whileHover={{ scale: 1.05 }}
                          >
                            {pageNum}
                          </motion.button>
                        );
                      })}

                      <motion.button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
                      >
                        <ChevronRight size={18} />
                      </motion.button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Details Modal */}
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
                      <motion.button
                        onClick={() => setShowDetails(false)}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-2"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                      >
                        <X size={20} />
                      </motion.button>
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
                        <span className="text-3xl font-bold text-red-700">₹{selectedDefaulter.totalDue}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <motion.button
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
                            totalDue: selectedDefaulter.totalDue,
                            bills: selectedDefaulter.bills,
                            daysOverdue: selectedDefaulter.daysOverdue,
                            lastBooking: selectedDefaulter.lastBooking
                          };
                          onOpenPaymentModal?.(bookingData);
                        }}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                      >
                        <CreditCard size={20} />
                        Pay ₹{selectedDefaulter.totalDue} Now
                      </motion.button>

                      {selectedDefaulter.paidAmount > 0 && canRollback && (
                        <motion.button
                          onClick={() => {
                            setShowDetails(false);
                            setShowRollbackModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                        >
                          <AlertCircle size={20} />
                          Rollback Payment
                        </motion.button>
                      )}

                      <motion.button
                        onClick={() => setShowDetails(false)}
                        className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold"
                      >
                        Close
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rollback Payment Modal */}
          <AnimatePresence>
            {showRollbackModal &&
             selectedDefaulter &&
             (role === "admin" || role === "manager") && (
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
                        <motion.div
                          className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl"
                          animate={{ rotate: [0, -10, 10, -10, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
                        >
                          <AlertCircle className="w-8 h-8" />
                        </motion.div>
                        <div>
                          <h3 className="text-2xl font-bold">Rollback Payment</h3>
                          <p className="text-white/90 text-sm">{selectedDefaulter.guest}</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => setShowRollbackModal(false)}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-2"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                      >
                        <X size={20} />
                      </motion.button>
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
                        value={rollbackAmount || ''}
                        onChange={(e) => setRollbackAmount(Math.min(selectedDefaulter.paidAmount || 0, Number(e.target.value) || 0))}
                        min="1"
                        max={selectedDefaulter.paidAmount || 0}
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
                              ₹{selectedDefaulter.totalDue + rollbackAmount}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <motion.button
                        onClick={handleRollbackPayment}
                        disabled={loading || !rollbackAmount || !rollbackRemarks.trim() || rollbackAttachments.length === 0}
                        className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? "Processing..." : `Rollback ₹${rollbackAmount}`}
                      </motion.button>
                      <motion.button
                        onClick={() => setShowRollbackModal(false)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.main>
  );
};

export default DefaulterManagement;