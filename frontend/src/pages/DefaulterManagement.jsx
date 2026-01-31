import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Search, AlertCircle, CreditCard, User, Phone, Mail, 
  Calendar, Building2, ChevronLeft, ChevronRight, FileText, Clock, 
  Ban, CheckCircle, Receipt, History, ArrowLeft, Upload
} from 'lucide-react';
import { BACKEND_URL } from '../utils/apiConfig';
import { useToast } from "../context/ToastContext";

const API = BACKEND_URL;

/**
 * ============================================================================
 * DEFAULTER MANAGEMENT SYSTEM - BUSINESS LOGIC
 * ============================================================================
 * 
 * PURPOSE:
 * - Track guests who checked out with pending payments
 * - Prevent re-booking until pending dues are cleared
 * - Manage payment rollbacks (waivers/discounts)
 * - Maintain complete payment history
 * 
 * FLOW:
 * 1. Guest checks out → If balance > 0 → Automatically added to Defaulters
 * 2. Guest tries to report-in → System checks for pending bills
 * 3. If pending bills exist → Block report-in with warning
 * 4. Guest can clear dues by:
 *    a) Paying full amount → Moves to "Completed" tab → Can report-in again
 *    b) Paying partial + remaining rollback → Still in "Pending" tab
 *    c) Admin rollbacks full amount → Moves to "Rollback" tab → Can report-in again
 * 
 * TAB CATEGORIZATION:
 * - PENDING: Guests with balanceAmount > 0 (blocked from check-in)
 * - COMPLETED: Guests with balanceAmount = 0 AND no rollbacks (can check-in)
 * - ROLLBACK: Guests with balanceAmount = 0 AND has rollbacks (can check-in)
 * 
 * CRITICAL RULES:
 * - Block check-in: ONLY if balanceAmount > 0
 * - Allow check-in: If balanceAmount = 0 (paid OR rolled back)
 * - History: All payment/rollback actions are stored in booking document
 * ============================================================================
 */

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
  
  const itemsPerPage = 10;
  const { showToast } = useToast();

  const role = currentUser?.role || "caretaker";
  const canRollback = role === "admin" || role === "manager";

  useEffect(() => { fetchDefaulters(); }, []);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape" && onBack) onBack(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onBack]);

  /**
   * FETCH DEFAULTERS FROM BACKEND
   * Backend: GET /api/defaulters (default query gets pending defaulters)
   * 
   * CRITICAL: We fetch ONLY guests who currently have OR had pending balance
   * - Pending tab: balanceAmount > 0
   * - Completed tab: balanceAmount = 0 but HAD balance before (paid through defaulter system)
   * - Rollback tab: balanceAmount = 0 due to rollback
   * 
   * We DON'T show guests who paid everything during their stay (never defaulted)
   */
  const fetchDefaulters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Fetch pending defaulters first (balanceAmount > 0)
      const response = await fetch(`${API}/api/defaulters`, {
        method: "GET",
        credentials: "include",
        headers
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();

      if (data.success && Array.isArray(data.defaulters)) {
        const allDefaulters = data.defaulters.map(d => {
          const totalAmount = Number(d.totalAmount || 0);
          const paidAmount = Number(d.paidAmount || 0);
          const discount = Number(d.discount || 0);
          const totalRolledBack = Array.isArray(d.paymentRollbacks) 
            ? d.paymentRollbacks.reduce((sum, r) => sum + (r.amount || 0), 0)
            : 0;
          
          const actualBalance = totalAmount - paidAmount - discount;
          
          return {
            ...d,
            department: d.department || "",
            rollno: d.rollno || "",
            bills: Array.isArray(d.bills) ? d.bills : [],
            paidAmount,
            totalAmount,
            discount,
            totalDue: actualBalance,
            totalRolledBack,
            paymentRollbacks: Array.isArray(d.paymentRollbacks) ? d.paymentRollbacks : []
          };
        });

        // Fetch completed defaulters (balanceAmount = 0 but were defaulters)
        const completedResponse = await fetch(`${API}/api/defaulters?status=completed`, {
          method: "GET",
          credentials: "include",
          headers
        });

        if (completedResponse.ok) {
          const completedData = await completedResponse.json();
          if (completedData.success && Array.isArray(completedData.defaulters)) {
            const completedDefaulters = completedData.defaulters
              .filter(d => {
                // Only include if they have rollback history OR discount > 0
                // This ensures they were processed through defaulter management
                const hasRollbacks = Array.isArray(d.paymentRollbacks) && d.paymentRollbacks.length > 0;
                const hasDiscount = Number(d.discount || 0) > 0;
                return hasRollbacks || hasDiscount;
              })
              .map(d => {
                const totalAmount = Number(d.totalAmount || 0);
                const paidAmount = Number(d.paidAmount || 0);
                const discount = Number(d.discount || 0);
                const totalRolledBack = Array.isArray(d.paymentRollbacks) 
                  ? d.paymentRollbacks.reduce((sum, r) => sum + (r.amount || 0), 0)
                  : 0;
                
                const actualBalance = totalAmount - paidAmount - discount;
                
                return {
                  ...d,
                  department: d.department || "",
                  rollno: d.rollno || "",
                  bills: Array.isArray(d.bills) ? d.bills : [],
                  paidAmount,
                  totalAmount,
                  discount,
                  totalDue: actualBalance,
                  totalRolledBack,
                  paymentRollbacks: Array.isArray(d.paymentRollbacks) ? d.paymentRollbacks : []
                };
              });

            // Combine pending and completed defaulters
            const combined = [...allDefaulters, ...completedDefaulters];
            setDefaulters(combined);
            setFilteredDefaulters(combined);
            return;
          }
        }

        setDefaulters(allDefaulters);
        setFilteredDefaulters(allDefaulters);
      } else {
        setDefaulters([]);
        setFilteredDefaulters([]);
      }
    } catch (err) {
      console.error('Failed to fetch defaulters:', err);
      showToast('Failed to fetch defaulters', 'error');
      setDefaulters([]);
      setFilteredDefaulters([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * TAB FILTERING LOGIC
   * PENDING: totalDue > 0 (blocked from check-in)
   * COMPLETED: totalDue = 0 AND no rollbacks (can check-in)
   * ROLLBACK: totalDue = 0 AND has rollbacks (can check-in)
   */
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

    if (activeTab === 'pending') {
      filtered = filtered.filter(d => d.totalDue > 0);
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(d => {
        const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
        const totalRolledBack = d.totalRolledBack || 0;
        return d.totalDue <= 0 && (!hasRollbacks || totalRolledBack === 0);
      });
    } else if (activeTab === 'rollback') {
      filtered = filtered.filter(d => {
        const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
        const totalRolledBack = d.totalRolledBack || 0;
        return hasRollbacks && totalRolledBack > 0 && d.totalDue <= 0;
      });
    }

    setFilteredDefaulters(filtered);
    setCurrentPage(1);
  }, [defaulters, searchQuery, selectedHostel, dateFrom, dateTo, activeTab]);

  const paginatedDefaulters = filteredDefaulters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredDefaulters.length / itemsPerPage);

  const handleOpenPayment = (defaulter) => {
    if (onOpenPaymentModal) {
      onOpenPaymentModal({
        bookingId: defaulter.bookingId || defaulter._id,
        guest: defaulter.guest,
        totalAmount: defaulter.totalAmount,
        paidAmount: defaulter.paidAmount,
        balance: defaulter.totalDue
      });
    }
  };

  const handleViewDetails = (defaulter) => {
    setSelectedDefaulter(defaulter);
    setShowDetails(true);
  };

  const handleRollback = (defaulter) => {
    setSelectedDefaulter(defaulter);
    setShowRollbackModal(true);
    setRollbackAmount('');
    setRollbackRemarks('');
    setRollbackAttachments([]);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingRollback(true);

    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'rollback_proof');
      formData.append('cloud_name', 'dujijovxu');

      try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dujijovxu/auto/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.secure_url;
      } catch (error) {
        console.error('Upload error:', error);
        showToast('Failed to upload file', 'error');
        return null;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    const validUrls = uploadedUrls.filter(url => url !== null);
    
    setRollbackAttachments(prev => [...prev, ...validUrls]);
    setUploadingRollback(false);
  };

  /**
   * ROLLBACK PAYMENT HANDLER
   * Backend: POST /api/defaulters/:id/rollback
   * - Increases discount by rollback amount
   * - Recalculates balanceAmount
   * - Stores rollback history in paymentRollbacks array
   */
  const handleRollbackPayment = async () => {
    if (!rollbackAmount || parseFloat(rollbackAmount) <= 0) {
      showToast('Please enter a valid rollback amount', 'error');
      return;
    }

    if (!rollbackRemarks.trim()) {
      showToast('Please provide remarks for the rollback', 'error');
      return;
    }

    if (rollbackAttachments.length === 0) {
      showToast('Please upload proof for the rollback', 'error');
      return;
    }

    const amount = parseFloat(rollbackAmount);
    const maxAmount = selectedDefaulter.totalDue || 0;

    if (amount > maxAmount) {
      showToast(`Rollback amount cannot exceed ₹${maxAmount}`, 'error');
      return;
    }

    setConfirmAction({
      title: "Confirm Rollback",
      message: `Are you sure you want to rollback ₹${amount} for ${selectedDefaulter.guest}? This will reduce their outstanding balance.`,
      onConfirm: async () => {
        try {
          setLoading(true);

          const token = localStorage.getItem("token");
          const headers = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const bookingId = selectedDefaulter.bookingId || selectedDefaulter._id;
          const response = await fetch(`${API}/api/defaulters/${bookingId}/rollback`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              amount: amount,
              remarks: rollbackRemarks,
              attachments: rollbackAttachments,
              rolledBackBy: currentUser?.name || 'Admin'
            })
          });

          const data = await response.json();

          if (data.success) {
            showToast('Payment rolled back successfully', 'success');
            setShowRollbackModal(false);
            setRollbackAmount('');
            setRollbackRemarks('');
            setRollbackAttachments([]);
            await fetchDefaulters();
          } else {
            showToast(data.message || 'Failed to rollback payment', 'error');
          }
        } catch (error) {
          console.error('Rollback error:', error);
          showToast('Failed to rollback payment', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const exportToCSV = () => {
    const csvData = filteredDefaulters.map(d => ({
      Guest: d.guest,
      Email: d.email,
      Contact: d.contact,
      'Roll No': d.rollno,
      Hostel: d.hostel,
      'Check Out': new Date(d.checkoutDate).toLocaleDateString(),
      'Total Amount': d.totalAmount,
      'Paid Amount': d.paidAmount,
      'Discount': d.discount,
      'Balance Due': d.totalDue,
      'Rolled Back': d.totalRolledBack || 0
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defaulters_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const uniqueHostels = [...new Set(defaulters.map(d => d.hostel))];

  const stats = {
    total: defaulters.length,
    pending: defaulters.filter(d => d.totalDue > 0).length,
    completed: defaulters.filter(d => {
      const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
      const totalRolledBack = d.totalRolledBack || 0;
      return d.totalDue <= 0 && (!hasRollbacks || totalRolledBack === 0);
    }).length,
    rollback: defaulters.filter(d => {
      const hasRollbacks = d.paymentRollbacks && d.paymentRollbacks.length > 0;
      const totalRolledBack = d.totalRolledBack || 0;
      return hasRollbacks && totalRolledBack > 0 && d.totalDue <= 0;
    }).length,
    totalDue: defaulters.reduce((sum, d) => sum + (d.totalDue > 0 ? d.totalDue : 0), 0),
    totalRolledBack: defaulters.reduce((sum, d) => sum + (d.totalRolledBack || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Defaulter Management</h1>
                <p className="text-sm text-gray-500">Track and manage overdue payments</p>
              </div>
            </div>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Defaulters</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Payments</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">₹{stats.totalDue.toLocaleString()} pending</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rolled Back</p>
                <p className="text-3xl font-bold text-purple-600">{stats.rollback}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Ban className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">₹{stats.totalRolledBack.toLocaleString()} waived</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, email, roll no..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hostel</label>
              <select value={selectedHostel} onChange={(e) => setSelectedHostel(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="All">All Hostels</option>
                {uniqueHostels.map(hostel => (<option key={hostel} value={hostel}>{hostel}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button onClick={() => setActiveTab('pending')} className={`flex-1 px-6 py-4 text-sm font-medium transition ${activeTab === 'pending' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <div className="flex items-center justify-center gap-2"><Clock className="w-5 h-5" /><span>Pending ({stats.pending})</span></div>
            </button>

            <button onClick={() => setActiveTab('completed')} className={`flex-1 px-6 py-4 text-sm font-medium transition ${activeTab === 'completed' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <div className="flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /><span>Completed ({stats.completed})</span></div>
            </button>

            <button onClick={() => setActiveTab('rollback')} className={`flex-1 px-6 py-4 text-sm font-medium transition ${activeTab === 'rollback' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <div className="flex items-center justify-center gap-2"><Ban className="w-5 h-5" /><span>Rolled Back ({stats.rollback})</span></div>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredDefaulters.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No defaulters found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hostel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checkout</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      {activeTab === 'rollback' && (<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rolled Back</th>)}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedDefaulters.map((defaulter, index) => (
                      <motion.tr key={defaulter.bookingId || defaulter._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{defaulter.guest.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{defaulter.guest}</div>
                              {defaulter.rollno && <div className="text-xs text-gray-500">Roll: {defaulter.rollno}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{defaulter.email}</div>
                          <div className="text-xs text-gray-500">{defaulter.contact}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{defaulter.hostel}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{new Date(defaulter.checkoutDate).toLocaleDateString()}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><div className="text-sm font-medium text-gray-900">₹{defaulter.totalAmount.toLocaleString()}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><div className="text-sm font-medium text-green-600">₹{defaulter.paidAmount.toLocaleString()}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><div className={`text-sm font-bold ${defaulter.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{defaulter.totalDue.toLocaleString()}</div></td>
                        {activeTab === 'rollback' && (<td className="px-6 py-4 whitespace-nowrap text-right"><div className="text-sm font-medium text-purple-600">₹{(defaulter.totalRolledBack || 0).toLocaleString()}</div></td>)}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleViewDetails(defaulter)} className="text-blue-600 hover:text-blue-900 transition" title="View Details"><FileText className="w-5 h-5" /></button>
                            {activeTab === 'pending' && (
                              <>
                                <button onClick={() => handleOpenPayment(defaulter)} className="text-green-600 hover:text-green-900 transition" title="Pay"><CreditCard className="w-5 h-5" /></button>
                                {canRollback && (<button onClick={() => handleRollback(defaulter)} className="text-orange-600 hover:text-orange-900 transition" title="Rollback/Waive"><Ban className="w-5 h-5" /></button>)}
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredDefaulters.length)} of {filteredDefaulters.length} results</div>
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"><ChevronLeft className="w-5 h-5" /></button>
                      <span className="px-4 py-2 text-sm font-medium text-gray-700">Page {currentPage} of {totalPages}</span>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && selectedDefaulter && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetails(false)}>
            <motion.div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Defaulter Details</h2>
                <button onClick={() => setShowDetails(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3"><div className="bg-blue-100 p-3 rounded-xl"><User className="w-6 h-6 text-blue-600" /></div><div><p className="text-sm text-gray-600">Guest Name</p><p className="text-lg font-semibold text-gray-900">{selectedDefaulter.guest}</p></div></div>
                    <div className="flex items-center gap-3"><div className="bg-green-100 p-3 rounded-xl"><Mail className="w-6 h-6 text-green-600" /></div><div><p className="text-sm text-gray-600">Email</p><p className="text-lg font-semibold text-gray-900">{selectedDefaulter.email}</p></div></div>
                    <div className="flex items-center gap-3"><div className="bg-purple-100 p-3 rounded-xl"><Phone className="w-6 h-6 text-purple-600" /></div><div><p className="text-sm text-gray-600">Contact</p><p className="text-lg font-semibold text-gray-900">{selectedDefaulter.contact}</p></div></div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3"><div className="bg-orange-100 p-3 rounded-xl"><Building2 className="w-6 h-6 text-orange-600" /></div><div><p className="text-sm text-gray-600">Hostel</p><p className="text-lg font-semibold text-gray-900">{selectedDefaulter.hostel}</p></div></div>
                    <div className="flex items-center gap-3"><div className="bg-red-100 p-3 rounded-xl"><Calendar className="w-6 h-6 text-red-600" /></div><div><p className="text-sm text-gray-600">Checkout Date</p><p className="text-lg font-semibold text-gray-900">{new Date(selectedDefaulter.checkoutDate).toLocaleDateString()}</p></div></div>
                    {selectedDefaulter.rollno && (<div className="flex items-center gap-3"><div className="bg-indigo-100 p-3 rounded-xl"><FileText className="w-6 h-6 text-indigo-600" /></div><div><p className="text-sm text-gray-600">Roll Number</p><p className="text-lg font-semibold text-gray-900">{selectedDefaulter.rollno}</p></div></div>)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-sm text-gray-600 mb-1">Total Amount</p><p className="text-2xl font-bold text-gray-900">₹{selectedDefaulter.totalAmount.toLocaleString()}</p></div>
                    <div><p className="text-sm text-gray-600 mb-1">Paid Amount</p><p className="text-2xl font-bold text-green-600">₹{selectedDefaulter.paidAmount.toLocaleString()}</p></div>
                    <div><p className="text-sm text-gray-600 mb-1">Discount</p><p className="text-2xl font-bold text-orange-600">₹{selectedDefaulter.discount.toLocaleString()}</p></div>
                    <div><p className="text-sm text-gray-600 mb-1">Balance Due</p><p className={`text-2xl font-bold ${selectedDefaulter.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{selectedDefaulter.totalDue.toLocaleString()}</p></div>
                  </div>
                </div>

                {selectedDefaulter.paymentRollbacks && selectedDefaulter.paymentRollbacks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><History className="w-5 h-5" />Rollback History</h3>
                    <div className="space-y-3">
                      {selectedDefaulter.paymentRollbacks.map((rollback, index) => (
                        <div key={index} className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div><p className="font-semibold text-gray-900">₹{rollback.amount.toLocaleString()} Rolled Back</p><p className="text-sm text-gray-600">By: {rollback.rolledBackBy}</p></div>
                            <span className="text-xs text-gray-500">{new Date(rollback.date || rollback.rollbackDate).toLocaleDateString()}</span>
                          </div>
                          {rollback.remarks && (<p className="text-sm text-gray-700 mt-2"><span className="font-medium">Remarks:</span> {rollback.remarks}</p>)}
                          {rollback.attachments && rollback.attachments.length > 0 && (
                            <div className="mt-2"><p className="text-xs font-medium text-gray-600 mb-1">Proof:</p><div className="flex gap-2 flex-wrap">{rollback.attachments.map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs bg-white px-3 py-1 rounded-lg border border-purple-300 hover:bg-purple-100 transition">View Proof {i + 1}</a>))}</div></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDefaulter.bills && selectedDefaulter.bills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Receipt className="w-5 h-5" />Bills</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">{selectedDefaulter.bills.map((bill, index) => (<tr key={index}><td className="px-4 py-2 text-sm text-gray-900">{bill.item || 'Bill Item'}</td><td className="px-4 py-2 text-sm text-right font-medium text-gray-900">₹{bill.amount.toLocaleString()}</td></tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rollback Modal */}
      <AnimatePresence>
        {showRollbackModal && selectedDefaulter && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRollbackModal(false)}>
            <motion.div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Rollback Payment</h2>
                <button onClick={() => setShowRollbackModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-orange-800 mb-2">Guest: {selectedDefaulter.guest}</p>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div><p className="text-gray-600">Total Amount</p><p className="font-bold text-gray-900">₹{selectedDefaulter.totalAmount}</p></div>
                    <div><p className="text-gray-600">Paid Amount</p><p className="font-bold text-green-600">₹{selectedDefaulter.paidAmount}</p></div>
                    <div><p className="text-gray-600">Current Balance</p><p className="font-bold text-red-600">₹{selectedDefaulter.totalDue}</p></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Rollback Amount <span className="text-red-500">*</span></label>
                  <input type="number" value={rollbackAmount} onChange={(e) => setRollbackAmount(e.target.value)} onBlur={() => { if (!rollbackAmount || rollbackAmount === '') return; const numValue = parseFloat(rollbackAmount); if (isNaN(numValue)) return; const maxAmount = selectedDefaulter.totalDue || 0; if (numValue > maxAmount) setRollbackAmount(maxAmount.toString()); }} min="0" max={selectedDefaulter.totalDue || 0} step="1" placeholder="Enter amount to rollback" className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                  <p className="text-xs text-gray-500 mt-1">Maximum: ₹{selectedDefaulter.totalDue || 0}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Remarks <span className="text-red-500">* (Mandatory)</span></label>
                  <textarea value={rollbackRemarks} onChange={(e) => setRollbackRemarks(e.target.value)} placeholder="Enter reason for rollback (mandatory)..." className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 h-24 resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Upload Proof <span className="text-red-500">* (Mandatory)</span></label>
                  <input type="file" onChange={handleFileUpload} className="hidden" id="rollback-upload" accept="image/*,.pdf" />
                  <label htmlFor="rollback-upload" className="w-full border-2 border-dashed border-gray-400 rounded-xl p-4 hover:border-orange-500 hover:bg-orange-50 transition text-center cursor-pointer block">
                    {uploadingRollback ? (<div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div><p className="text-sm text-gray-600">Uploading...</p></div>) : (<div className="flex flex-col items-center gap-2"><Upload className="w-8 h-8 text-gray-400" /><p className="text-sm text-gray-600">Click to upload proof</p></div>)}
                  </label>

                  {rollbackAttachments.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-green-700 mb-2">✅ Uploaded: {rollbackAttachments.length}</p>
                      <ul className="space-y-1">{rollbackAttachments.map((url, i) => (<li key={i} className="flex items-center justify-between bg-white p-2 rounded"><span className="text-xs text-blue-600 truncate flex-1">File {i + 1}</span><button onClick={() => setRollbackAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700"><X size={16} /></button></li>))}</ul>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {confirmAction && (
                    <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <motion.div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmAction.title}</h3>
                        <p className="text-gray-600 mb-6">{confirmAction.message}</p>
                        <div className="flex gap-3">
                          <button onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition">Yes, Continue</button>
                          <button onClick={() => setConfirmAction(null)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition">Cancel</button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {rollbackAmount && parseFloat(rollbackAmount) > 0 && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-orange-800 mb-2">After Waiver:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-gray-600">New Discount/Waiver</p><p className="font-bold text-green-700">₹{(selectedDefaulter.discount || 0) + parseFloat(rollbackAmount || 0)}</p></div>
                      <div><p className="text-gray-600">New Balance</p><p className="font-bold text-red-700">₹{(selectedDefaulter.totalDue || 0) - parseFloat(rollbackAmount || 0)}</p></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button onClick={handleRollbackPayment} disabled={loading || !rollbackAmount || parseFloat(rollbackAmount) <= 0 || !rollbackRemarks.trim() || rollbackAttachments.length === 0} className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-700 hover:to-red-700 transition">
                    {loading ? "Processing..." : `Waive ₹${rollbackAmount}`}
                  </button>
                  <button onClick={() => setShowRollbackModal(false)} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition">Cancel</button>
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