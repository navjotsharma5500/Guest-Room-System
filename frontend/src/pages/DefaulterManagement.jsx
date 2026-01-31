import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Search, Filter, AlertCircle, CreditCard, 
  User, Phone, Mail, Calendar, Building2, ChevronLeft,
  ChevronRight, FileText, Clock, TrendingUp, Ban,
  CheckCircle, Receipt, History, DollarSign, ArrowLeft, Upload
} from 'lucide-react';
import { BACKEND_URL } from '../utils/apiConfig';
import { useToast } from "../context/ToastContext";
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
  const [rollbackAmount, setRollbackAmount] = useState('');
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
  const { showToast } = useToast();
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
      const response = await fetch(`${API}/api/defaulters?status=all`, {
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
            
            const actualBalance = totalAmount - paidAmount - discount;
            
            return {
              ...d,
              department: d.department || "",
              rollno: d.rollno || "",
              bills: Array.isArray(d.bills) ? d.bills : [],
              paidAmount: paidAmount,
              totalAmount: totalAmount,
              discount: discount,
              totalDue: actualBalance,
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
  // ✅ TAB FILTERING LOGIC - FIXED: 'rollbacks' instead of 'rollback'
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
    // ✅ TAB FILTERING - FIXED
    if (activeTab === 'pending') {
      filtered = filtered.filter(d => {
        const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
        return d.totalDue > 0 && !hasRollbacks;
      });
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(d => {
        const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
        return hasRollbacks && d.totalDue <= 0;
      });
    } else if (activeTab === 'rollbacks') {
      // ✅ FIXED: Changed from 'rollback' to 'rollbacks' to match tab button
      filtered = filtered.filter(d => d.paymentRollbacks && d.paymentRollbacks.length > 0);
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
    return hasRollbacks && d.totalDue <= 0;
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
    if (rollbackAmount > selectedDefaulter.totalDue) { 
      alert(`⚠️ Cannot rollback ₹${rollbackAmount}. Current balance is only ₹${selectedDefaulter.totalDue}.`);
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
          showToast(`✅ ₹${rollbackAmount} rolled back successfully!`, "success");
          setShowRollbackModal(false);
          setRollbackAmount(0);
          setRollbackRemarks('');
          setRollbackAttachments([]);
          setShowDetails(false);
          setConfirmAction(null);
          
          await fetchDefaulters();
        } catch (err) {
          console.error("❌ Rollback error:", err);
          showToast(`❌ Failed to rollback payment: ${err.message}`, "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };
  const handleBulkEmail = async () => {
    if (pendingDefaulters.length === 0) {
      showToast("⚠️ No pending defaulters to email", "warning");
      return;
    }
    setConfirmAction({
      title: "Send Bulk Emails",
      message: `Are you sure you want to send payment reminder emails to ${pendingDefaulters.length} defaulter(s)?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem("token");
          const headers = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const response = await fetch(`${API}/api/defaulters/bulk-email`, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({
              defaulterIds: pendingDefaulters.map(d => d._id)
            }),
          });
          if (!response.ok) {
            throw new Error("Failed to send bulk emails");
          }
          const result = await response.json();
          showToast(`✅ Sent ${result.sent} payment reminder emails successfully!`, "success");
          setConfirmAction(null);
        } catch (err) {
          console.error("❌ Bulk email error:", err);
          showToast(`❌ Failed to send emails: ${err.message}`, "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };
  const handleBulkWhatsApp = () => {
    if (pendingDefaulters.length === 0) {
      showToast("⚠️ No pending defaulters to contact", "warning");
      return;
    }
    const messages = pendingDefaulters.map(d => {
      const message = `Hello ${d.guest},
This is a payment reminder from ${d.hostel}, TIET.
*Outstanding Amount:* ₹${d.totalDue}
*Days Overdue:* ${d.daysOverdue} days
Please settle the payment at the earliest.
Thank you!`;
      return {
        name: d.guest,
        phone: d.contact,
        url: `https://wa.me/${d.contact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
      };
    });
    setConfirmAction({
      title: "Bulk WhatsApp Messages",
      message: (
        <div className="space-y-4">
          <p className="text-gray-600">Click on each guest to send WhatsApp message:</p>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold">{msg.name}</p>
                  <p className="text-sm text-gray-500">{msg.phone}</p>
                </div>
                <a
                  href={msg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                >
                  <Phone className="w-4 h-4 inline mr-1" />
                  Open WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>
      ),
      onConfirm: () => {
        setConfirmAction(null);
        showToast("✅ WhatsApp links opened in new tabs", "success");
      },
      confirmText: "Close"
    });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50/30 to-orange-50/30 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-red-600 via-red-700 to-orange-600 rounded-3xl p-8 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={handleBackClick}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="bg-white/20 p-4 rounded-2xl">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Defaulter Management</h1>
                  <p className="text-red-100 mt-1">Outstanding Payment Tracking System</p>
                </div>
              </div>
              
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition font-semibold"
              >
                <Download className="w-5 h-5" />
                Download Report
              </button>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <DollarSign className="w-8 h-8 text-yellow-300" />
                  <div>
                    <p className="text-red-100 text-sm">Total Outstanding</p>
                    <p className="text-2xl font-bold">₹{totalOutstanding.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <User className="w-8 h-8 text-blue-300" />
                  <div>
                    <p className="text-red-100 text-sm">Total Defaulters</p>
                    <p className="text-2xl font-bold">{defaulters.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <Clock className="w-8 h-8 text-orange-300" />
                  <div>
                    <p className="text-red-100 text-sm">Avg Days Overdue</p>
                    <p className="text-2xl font-bold">{avgDaysOverdue}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-8 h-8 text-red-300" />
                  <div>
                    <p className="text-red-100 text-sm">Critical (30+ days)</p>
                    <p className="text-2xl font-bold">{criticalCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex flex-wrap items-end gap-4">
              {/* Date Range Filter */}
              <div className="flex items-end gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-600 mb-1">To</label>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
        </motion.div>
      
        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                  activeTab === 'pending'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Pending Payments
                  <span className={`px-2 py-0.5 rounded-full text-sm ${
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
                  <CheckCircle className="w-5 h-5" />
                  Completed
                  <span className={`px-2 py-0.5 rounded-full text-sm ${
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
                  <History className="w-5 h-5" />
                  Rollbacks
                  <span className={`px-2 py-0.5 rounded-full text-sm ${
                    activeTab === 'rollbacks' ? 'bg-white/20' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {rollbackCount}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
        {/* Bulk Action Buttons (Show only on Pending tab) */}
        {activeTab === 'pending' && pendingDefaulters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              <div className="flex gap-4">
                <button
                  onClick={handleBulkEmail}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-lg"
                >
                  <Mail className="w-5 h-5" />
                  Send Bulk Payment Reminders
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {pendingDefaulters.length}
                  </span>
                </button>
                <button
                  onClick={handleBulkWhatsApp}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition shadow-lg"
                >
                  <Phone className="w-5 h-5" />
                  Bulk WhatsApp
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {pendingDefaulters.length}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {/* Defaulters List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {loading ? (
            <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 font-medium">Loading defaulters...</p>
              </div>
            </div>
          ) : filteredDefaulters.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800">No Defaulters Found!</h3>
              <p className="text-gray-500 mt-2">All guests have cleared their payments ✓</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedDefaulters.map((defaulter) => (
                  <motion.div
                    key={defaulter._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative group"
                  >
                    {/* Animated border gradient */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl animate-pulse" />
                    </div>
                    
                    {/* Border */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-orange-200 rounded-2xl" />
                    
                    {/* Content */}
                    <div className="relative bg-white rounded-2xl p-6 shadow-lg m-[2px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                              {defaulter.guest.charAt(0)}
                            </div>
                            {/* Payment Status Flag */}
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
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
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{defaulter.guest}</h3>
                            <p className="text-gray-500">{defaulter.department} • {defaulter.rollno}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium text-gray-700">{defaulter.email}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Contact</p>
                            <p className="font-medium text-gray-700">{defaulter.contact}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Hostel</p>
                            <p className="font-medium text-gray-700">{defaulter.hostel} - {defaulter.roomNo}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Last Booking</p>
                            <p className="font-medium text-gray-700">{new Date(defaulter.lastBooking).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Outstanding</p>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-5 h-5 text-red-600" />
                              <span className="text-2xl font-bold text-red-600">
                                ₹{defaulter.totalDue.toLocaleString()}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(defaulter.daysOverdue)}`}>
                              <Clock className="w-3 h-3 inline mr-1" />
                              {defaulter.daysOverdue} days
                            </span>
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
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <FileText className="w-5 h-5 relative z-10" />
                            View Details
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between bg-white rounded-2xl p-4 shadow-lg">
                  <p className="text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredDefaulters.length)} of {filteredDefaulters.length} defaulters
                  </p>
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
                    
                    <div className="flex gap-1">
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
                            <span key={page} className="w-10 h-10 flex items-center justify-center text-gray-400">
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
        </motion.div>
      </div>
      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && selectedDefaulter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedDefaulter.guest}</h2>
                      <p className="text-red-100">Outstanding Payment Details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Guest Details */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-red-600" />
                    Guest Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedDefaulter.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-medium">{selectedDefaulter.contact}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-medium">{selectedDefaulter.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Roll Number</p>
                      <p className="font-medium">{selectedDefaulter.rollno}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Hostel</p>
                      <p className="font-medium">{selectedDefaulter.hostel}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Room</p>
                      <p className="font-medium">{selectedDefaulter.roomNo}</p>
                    </div>
                  </div>
                </div>
                {/* Bill Details */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-red-600" />
                    Unpaid Bills
                  </h3>
                  <div className="space-y-3">
                    {selectedDefaulter.bills.map((bill, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-800">{bill.billNumber}</p>
                          <p className="text-sm text-gray-500">Date: {new Date(bill.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">₹{bill.amount}</p>
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                            {bill.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-800">Total Outstanding</span>
                    <span className="text-2xl font-bold text-red-600">
                      ₹{(() => {
                        const totalAmount = selectedDefaulter.totalAmount || 0;
                        const paidAmount = selectedDefaulter.paidAmount || 0;
                        const discount = selectedDefaulter.discount || selectedDefaulter.waveOff || 0;
                        return totalAmount - paidAmount - discount;
                      })().toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Rollback History */}
                {selectedDefaulter.paymentRollbacks && selectedDefaulter.paymentRollbacks.length > 0 && (
                  <div className="bg-orange-50 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <History className="w-5 h-5 text-orange-600" />
                      Payment Rollback History ({selectedDefaulter.paymentRollbacks.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedDefaulter.paymentRollbacks.map((rollback, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-800">Rollback #{selectedDefaulter.paymentRollbacks.length - index}</p>
                              <p className="text-sm text-gray-500">
                                Date: {new Date(rollback.rollbackDate).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                By: {rollback.rolledBackBy?.name || 'System'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">₹{rollback.amount.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-sm text-gray-600 font-medium">Remarks:</p>
                            <p className="text-gray-700">{rollback.remarks}</p>
                          </div>
                          {rollback.attachments && rollback.attachments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-sm text-gray-600 font-medium">Attachments:</p>
                              <div className="flex gap-2 mt-1">
                                {rollback.attachments.map((att, i) => (
                                  <a
                                    key={i}
                                    href={att}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="w-4 h-4" />
                                    File {i + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-orange-200 flex justify-between items-center">
                      <span className="font-bold text-gray-800">Total Rolled Back</span>
                      <span className="text-xl font-bold text-orange-600">
                        ₹{selectedDefaulter.paymentRollbacks.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex gap-4">
                  {selectedDefaulter.totalDue > 0 && (
                    <button
                      onClick={() => {
                        if (onOpenPaymentModal) {
                          onOpenPaymentModal(selectedDefaulter);
                          setShowDetails(false);
                        }
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" />
                      Record Payment
                    </button>
                  )}
                  
                  {canRollback && selectedDefaulter.paidAmount > 0 && (
                    <button
                      onClick={() => {
                        setShowRollbackModal(true);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold hover:from-orange-700 hover:to-orange-800 transition flex items-center justify-center gap-2"
                    >
                      <History className="w-5 h-5" />
                      Rollback Payment
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Rollback Modal */}
      <AnimatePresence>
        {showRollbackModal && selectedDefaulter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowRollbackModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="w-8 h-8" />
                    <div>
                      <h2 className="text-xl font-bold">Rollback Payment</h2>
                      <p className="text-orange-100 text-sm">For {selectedDefaulter.guest}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRollbackModal(false)}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rollback Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={rollbackAmount}
                    onChange={(e) => setRollbackAmount(Number(e.target.value))}
                    max={selectedDefaulter.paidAmount}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder={`Max: ₹${selectedDefaulter.paidAmount}`}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Available to rollback: ₹{selectedDefaulter.paidAmount}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks (Required)
                  </label>
                  <textarea
                    value={rollbackRemarks}
                    onChange={(e) => setRollbackRemarks(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Reason for rollback..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments (Required)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
                    <input
                      type="file"
                      ref={ikRollbackUploadRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf"
                    />
                    <button
                      onClick={() => ikRollbackUploadRef.current?.click()}
                      disabled={uploadingRollback}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      {uploadingRollback ? (
                        <>
                          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Upload File
                        </>
                      )}
                    </button>
                    {rollbackAttachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {rollbackAttachments.map((att, i) => (
                          <div key={i} className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                            <span className="text-sm text-green-700 truncate flex-1">
                              <FileText className="w-4 h-4 inline mr-1" />
                              File {i + 1}
                            </span>
                            <button
                              onClick={() => setRollbackAttachments(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleRollbackPayment}
                  disabled={!rollbackAmount || !rollbackRemarks.trim() || rollbackAttachments.length === 0}
                  className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                    rollbackAmount && rollbackRemarks.trim() && rollbackAttachments.length > 0
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <History className="w-5 h-5" />
                  Confirm Rollback
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Confirm Action Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">{confirmAction.title}</h3>
              <div className="text-gray-600 mb-6">
                {typeof confirmAction.message === 'string' ? (
                  <p>{confirmAction.message}</p>
                ) : (
                  confirmAction.message
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction.onConfirm}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition"
                >
                  {confirmAction.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default DefaulterManagement;