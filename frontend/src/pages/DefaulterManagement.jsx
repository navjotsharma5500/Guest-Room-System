import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Search, Filter, AlertCircle, CreditCard, 
  User, Phone, Mail, Calendar, Building2, ChevronLeft,
  ChevronRight, FileText, Clock, TrendingUp, Ban,
  CheckCircle, Receipt, History, DollarSign, ArrowLeft
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
  
  const itemsPerPage = 10;
  const role = currentUser?.role || 'caretaker';
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel;

  // Fetch defaulters
  useEffect(() => {
    fetchDefaulters();
  }, []);

  const fetchDefaulters = async () => {
    try {
      setLoading(true);
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

      if (data.success) {
        setDefaulters(data.defaulters || []);
        setFilteredDefaulters(data.defaulters || []);
      } else {
        console.error('API returned success: false');
        setDefaulters([]);
        setFilteredDefaulters([]);
      }
    } catch (err) {
      console.error('Failed to fetch defaulters:', err);
      setDefaulters([]);
      setFilteredDefaulters([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search
  useEffect(() => {
    let filtered = [...defaulters];

    // Search
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

  // Download CSV
  const handleDownload = () => {
    const headers = ['Guest Name', 'Email', 'Contact', 'Hostel', 'Room', 'Department', 'Roll No', 'Total Due', 'Days Overdue', 'Last Booking'];
    
    let dataToDownload = filteredDefaulters;
    if (role === 'caretaker' && assignedHostel) {
      dataToDownload = dataToDownload.filter(d => d.hostel === assignedHostel);
    }

    const csvContent = [
      headers.join(','),
      ...dataToDownload.map(d => [
        `"${d.guest}"`,
        `"${d.email}"`,
        d.contact,
        `"${d.hostel}"`,
        d.roomNo,
        `"${d.department}"`,
        d.rollno,
        d.totalDue,
        d.daysOverdue,
        d.lastBooking
      ].join(','))
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        if (showDetails) {
          setShowDetails(false);
        } else {
          onBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showDetails, onBack]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 pt-4">
      <div className="max-w-7xl mx-auto">
        {/* ✅ BACK BUTTON + HEADER */}
        <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white p-6 rounded-3xl shadow-2xl border-4 border-red-500 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <motion.button
                onClick={onBack}
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
            {/* Search */}
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

            {/* Hostel Filter (Admin/Manager only) */}
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

            {/* Download Button */}
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
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 mb-6">
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
              <div className="space-y-3">
                {paginatedDefaulters.map((defaulter, index) => (
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
                        {/* Guest Info */}
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

                        {/* Amount & Actions */}
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

              {/* Pagination */}
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

        {/* Details Modal - Keep existing modal code */}
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
                {/* Keep your existing modal content exactly as is */}
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
                        onOpenPaymentModal(selectedDefaulter);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CreditCard size={20} />
                      Pay ₹{selectedDefaulter.totalDue} Now
                    </motion.button>

                    <motion.button
                      onClick={() => setShowDetails(false)}
                      className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Close
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DefaulterManagement;