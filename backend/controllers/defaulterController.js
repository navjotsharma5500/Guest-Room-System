// backend/controllers/defaulterController.js
import Booking from "../models/Booking.js";
import Bill from "../models/Bill.js";

// Get all defaulters (guests with pending payments who are reported)
export const getDefaulters = async (req, res) => {
  try {
    const userRole = req.user.role;
    const assignedHostel = req.user.assignedHostel || req.user.hostel;

    // Find all bookings with:
    // 1. reportedStatus = "reported" (guest has checked in)
    // 2. balanceAmount > 0 (has pending payment)
    // 3. paymentType !== "Free" (not free booking)
    
    let query = {
      reportedStatus: "reported",
      balanceAmount: { $gt: 0 },
      paymentType: { $ne: "Free" }
    };

    // Role-based filtering
    if (userRole === "caretaker" && assignedHostel) {
      query.hostel = assignedHostel;
    }

    const defaulterBookings = await Booking.find(query)
      .select('guest email contact hostel roomNo department rollno totalAmount paidAmount balanceAmount from to createdAt')
      .sort({ balanceAmount: -1 }) // Sort by highest outstanding first
      .lean();

    // Get unpaid bills for each booking
    const defaultersWithBills = await Promise.all(
      defaulterBookings.map(async (booking) => {
        const unpaidBills = await Bill.find({
          bookingId: booking._id,
          // You can add status field to Bill model if needed
        }).select('billNumber amountPaid createdAt balanceAfterPayment').lean();

        // Calculate days overdue (from booking checkout date)
        const checkoutDate = new Date(booking.to);
        const today = new Date();
        const daysOverdue = Math.floor((today - checkoutDate) / (1000 * 60 * 60 * 24));

        return {
          _id: booking._id,
          guest: booking.guest,
          email: booking.email,
          contact: booking.contact,
          hostel: booking.hostel,
          roomNo: booking.roomNo,
          department: booking.department,
          rollno: booking.rollno,
          totalDue: booking.balanceAmount,
          daysOverdue: Math.max(0, daysOverdue),
          lastBooking: booking.from,
          reportedStatus: "reported",
          bills: unpaidBills.map(bill => ({
            billNumber: bill.billNumber,
            amount: bill.balanceAfterPayment || 0,
            date: bill.createdAt,
            status: 'unpaid'
          }))
        };
      })
    );

    // Filter out guests with no overdue payments
    const activeDefaulters = defaultersWithBills.filter(d => d.totalDue > 0);

    res.json({
      success: true,
      defaulters: activeDefaulters,
      total: activeDefaulters.length,
      totalOutstanding: activeDefaulters.reduce((sum, d) => sum + d.totalDue, 0)
    });

  } catch (err) {
    console.error("❌ Get defaulters error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch defaulters",
      error: err.message
    });
  }
};

// Check if guest has previous pending bills (for report-in validation)
export const checkGuestHistory = async (req, res) => {
  try {
    const { email, contact } = req.query;

    if (!email && !contact) {
      return res.status(400).json({
        success: false,
        message: "Email or contact required"
      });
    }

    // Find any previous bookings with pending payments
    const query = {
      $or: [],
      balanceAmount: { $gt: 0 },
      reportedStatus: "reported",
      paymentType: { $ne: "Free" }
    };

    if (email) query.$or.push({ email });
    if (contact) query.$or.push({ contact });

    const pendingBookings = await Booking.find(query)
      .select('guest hostel roomNo balanceAmount from to')
      .lean();

    if (pendingBookings.length > 0) {
      const totalPending = pendingBookings.reduce((sum, b) => sum + b.balanceAmount, 0);

      // ✅ EMIT SOCKET.IO EVENT - Guest history check
      const io = req.app.get('io');
      if (io) {
        io.to('dashboard-room').emit('defaulter-check', { 
          email,
          contact,
          hasPendingBills: true,
          totalPending,
          bookingCount: pendingBookings.length,
          timestamp: Date.now()
        });
        console.log('📡 Emitted defaulter-check event');
      }

      return res.json({
        success: true,
        hasPendingBills: true,
        totalPending,
        bookings: pendingBookings,
        message: `Guest has ₹${totalPending} pending from ${pendingBookings.length} previous booking(s)`
      });
    }

    res.json({
      success: true,
      hasPendingBills: false,
      message: "No pending bills found"
    });

  } catch (err) {
    console.error("❌ Check guest history error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to check guest history",
      error: err.message
    });
  }
};

// Get defaulter statistics
export const getDefaulterStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const assignedHostel = req.user.assignedHostel || req.user.hostel;

    let query = {
      reportedStatus: "reported",
      balanceAmount: { $gt: 0 },
      paymentType: { $ne: "Free" }
    };

    // Role-based filtering
    if (userRole === "caretaker" && assignedHostel) {
      query.hostel = assignedHostel;
    }

    const defaulters = await Booking.find(query).lean();

    // Calculate average days overdue
    const today = new Date();
    let totalDaysOverdue = 0;
    let criticalCount = 0;

    defaulters.forEach(booking => {
      const checkoutDate = new Date(booking.to);
      const daysOverdue = Math.floor((today - checkoutDate) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 0) {
        totalDaysOverdue += daysOverdue;
        
        if (daysOverdue > 30) {
          criticalCount++;
        }
      }
    });

    const stats = {
      totalDefaulters: defaulters.length,
      totalOutstanding: defaulters.reduce((sum, d) => sum + (d.balanceAmount || 0), 0),
      criticalCount: criticalCount,
      avgDaysOverdue: defaulters.length > 0 
        ? Math.round(totalDaysOverdue / defaulters.length)
        : 0,
      avgOutstanding: defaulters.length > 0 
        ? Math.round(defaulters.reduce((sum, d) => sum + (d.balanceAmount || 0), 0) / defaulters.length)
        : 0
    };

    // ✅ EMIT SOCKET.IO EVENT - Stats updated
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('defaulter-stats-updated', { 
        stats,
        timestamp: Date.now()
      });
      console.log('📡 Emitted defaulter-stats-updated event');
    }

    res.json({ 
      success: true, 
      stats 
    });

  } catch (err) {
    console.error("❌ Get defaulter stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch defaulter statistics",
      error: err.message
    });
  }
};

// ✅ NEW: Mark defaulter as resolved (when payment is made)
export const resolveDefaulter = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentAmount, paymentMode, transactionId, remarks } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // Update payment details
    const previousBalance = booking.balanceAmount;
    booking.paidAmount = (booking.paidAmount || 0) + Number(paymentAmount);
    booking.balanceAmount = Math.max(0, booking.totalAmount - booking.paidAmount);
    
    if (booking.balanceAmount === 0) {
      booking.paymentStatus = "PAID";
    }

    if (paymentMode) booking.paymentMode = paymentMode;
    if (transactionId) booking.transactionId = transactionId;
    if (remarks) booking.paymentRemarks = remarks;

    await booking.save();

    console.log("✅ Defaulter resolved:", {
      bookingId: booking._id,
      guest: booking.guest,
      previousBalance,
      newBalance: booking.balanceAmount,
      paidAmount: paymentAmount
    });

    // ✅ EMIT SOCKET.IO EVENT - Defaulter resolved
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('defaulter-resolved', { 
        bookingId: booking._id,
        guest: booking.guest,
        hostel: booking.hostel,
        previousBalance,
        newBalance: booking.balanceAmount,
        paidAmount: Number(paymentAmount),
        fullyPaid: booking.balanceAmount === 0,
        timestamp: Date.now()
      });
      console.log('📡 Emitted defaulter-resolved event');
    }

    res.json({
      success: true,
      message: booking.balanceAmount === 0 
        ? "Payment completed - defaulter cleared" 
        : "Partial payment recorded",
      booking,
      previousBalance,
      newBalance: booking.balanceAmount
    });

  } catch (err) {
    console.error("❌ Resolve defaulter error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to resolve defaulter",
      error: err.message
    });
  }
};