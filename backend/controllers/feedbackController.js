// controllers/feedbackController.js
import Feedback from "../models/Feedback.js";
import Booking from "../models/Booking.js";
import GuestFeedback from "../models/GuestFeedback.js";
import { getSystemSettings } from "../utils/systemSettings.js";

// Helper: Get rating label from stars
const getRatingLabel = (stars) => {
  const labels = {
    1: "Poor",
    2: "Below Average",
    3: "Average",
    4: "Good",
    5: "Outstanding",
  };
  return labels[stars] || "Average";
};

// ========================================
// CREATE/UPDATE FEEDBACK
// ========================================
export const submitFeedback = async (req, res) => {
  try {
    const { bookingId, rating, remarks, attachments } = req.body;

    console.log("📝 Feedback submission:", {
      bookingId,
      rating,
      hasRemarks: !!remarks,
      attachmentsCount: attachments?.length || 0,
      userId: req.user?._id
    });

    // Validation
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required"
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5 stars"
      });
    }

    if (attachments && attachments.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 attachments allowed"
      });
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Only allow feedback for checked-out guests
    if (booking.status !== "checked_out") {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be submitted for checked-out guests"
      });
    }

    const ratingLabel = getRatingLabel(rating);

    const feedbackData = {
      bookingId,
      guest: booking.guest,
      email: booking.email,
      contact: booking.contact,
      hostel: booking.hostel,
      roomNo: booking.roomNo,
      checkInDate: booking.actualCheckInDate || booking.from,
      checkOutDate: booking.checkedOutAt || booking.to,
      rating,
      ratingLabel,
      remarks: remarks || "",
      attachments: attachments || [],
      submittedBy: req.user._id,
      submittedAt: new Date(),
    };

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ bookingId });

    let feedback;
    if (existingFeedback) {
      // Update existing feedback
      feedback = await Feedback.findOneAndUpdate(
        { bookingId },
        feedbackData,
        { new: true, runValidators: true }
      );
      console.log("✅ Feedback updated:", feedback._id);
    } else {
      // Create new feedback
      feedback = await Feedback.create(feedbackData);
      console.log("✅ Feedback created:", feedback._id);
    }

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('feedback-submitted', {
        feedbackId: feedback._id,
        bookingId,
        rating,
        timestamp: Date.now()
      });
      console.log('📡 Emitted feedback-submitted event');
    }

    res.json({
      success: true,
      message: existingFeedback ? "Feedback updated" : "Feedback submitted",
      feedback
    });

  } catch (err) {
    console.error("❌ Submit feedback error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: err.message
    });
  }
};

// ========================================
// GET ALL FEEDBACKS (with filters & pagination)
// ========================================
export const getAllFeedbacks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      hostel,
      rating,
      search,
      startDate,
      endDate,
    } = req.query;

    console.log("🔍 Fetching feedbacks:", {
      page,
      limit,
      hostel,
      rating,
      search,
      userId: req.user?._id,
      role: req.user?.role
    });

    // Build filter
    const filter = {};

    // Role-based filtering
    if (req.user.role === "caretaker" || req.user.role === "warden") {
      const assignedHostel = req.user.assignedHostel || req.user.hostel;
      if (!assignedHostel) {
        return res.status(400).json({
          success: false,
          message: "No hostel assigned to caretaker"
        });
      }
      filter.hostel = assignedHostel;
      console.log("🔒 Caretaker restricted to hostel:", assignedHostel);
    }

    // Hostel filter (admin/manager)
    if (hostel && req.user.role !== "caretaker" && req.user.role !== "warden") {
      filter.hostel = hostel;
    }

    // Rating filter
    if (rating) {
      filter.rating = Number(rating);
    }

    // Search by guest name, email, or contact
    if (search) {
      filter.$or = [
        { guest: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.checkOutDate = {};
      if (startDate) filter.checkOutDate.$gte = new Date(startDate);
      if (endDate) filter.checkOutDate.$lte = new Date(endDate);
    }

    console.log("📋 Filter:", JSON.stringify(filter, null, 2));

    // Count total
    const total = await Feedback.countDocuments(filter);

    // Fetch feedbacks with pagination
    const feedbacks = await Feedback.find(filter)
      .sort({ submittedAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("submittedBy", "name email")
      .lean();

    console.log(`✅ Found ${feedbacks.length} feedbacks (total: ${total})`);

    res.json({
      success: true,
      feedbacks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    console.error("❌ Get feedbacks error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedbacks",
      error: err.message
    });
  }
};

// ========================================
// GET FEEDBACK BY BOOKING ID
// ========================================
export const getFeedbackByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const feedback = await Feedback.findOne({ bookingId })
      .populate("submittedBy", "name email")
      .lean();

    if (!feedback) {
      return res.json({
        success: true,
        feedback: null,
        message: "No feedback found for this booking"
      });
    }

    res.json({
      success: true,
      feedback
    });

  } catch (err) {
    console.error("❌ Get feedback error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
      error: err.message
    });
  }
};

// ========================================
// DELETE FEEDBACK (Admin only)
// ========================================
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete feedback"
      });
    }

    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found"
      });
    }

    console.log("✅ Feedback deleted:", id);

    res.json({
      success: true,
      message: "Feedback deleted successfully"
    });

  } catch (err) {
    console.error("❌ Delete feedback error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete feedback",
      error: err.message
    });
  }
};

// ========================================
// GET FEEDBACK STATISTICS
// ========================================
export const getFeedbackStats = async (req, res) => {
  try {
    const { hostel } = req.query;

    const filter = {};
    
    // Role-based filtering
    if (req.user.role === "caretaker" || req.user.role === "warden") {
      filter.hostel = req.user.assignedHostel || req.user.hostel;
    } else if (hostel) {
      filter.hostel = hostel;
    }

    const stats = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const avgRating = stats.reduce((sum, s) => sum + s._id * s.count, 0) / (total || 1);

    res.json({
      success: true,
      stats: {
        total,
        average: Number(avgRating.toFixed(2)),
        breakdown: stats.map(s => ({
          rating: s._id,
          count: s.count,
          percentage: Number(((s.count / total) * 100).toFixed(1)),
        })),
      },
    });

  } catch (err) {
    console.error("❌ Get stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: err.message
    });
  }
};

const roundRating = (value) => Number((value || 0).toFixed(2));

const getRoleScopedHostel = (req, requestedHostel) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (String(req.query?.global || "").toLowerCase() === "true") {
    return requestedHostel || "";
  }
  if (role === "caretaker" || role === "warden" || role === "co_warden") {
    return req.user?.assignedHostel || req.user?.hostel || "";
  }
  return requestedHostel || "";
};

const buildDateFilter = ({ startDate, endDate }, fieldName) => {
  if (!startDate && !endDate) return {};
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) range.$lte = new Date(endDate);
  return { [fieldName]: range };
};

const mergeHostelRows = (internalRows = [], publicRows = []) => {
  const map = new Map();

  for (const row of [...internalRows, ...publicRows]) {
    if (!row?._id) continue;
    const current = map.get(row._id) || {
      hostel: row._id,
      totalReviews: 0,
      ratingSum: 0,
      internalReviews: 0,
      publicReviews: 0,
    };

    current.totalReviews += row.totalReviews || 0;
    current.ratingSum += row.ratingSum || 0;
    current.internalReviews += row.source === "internal" ? row.totalReviews || 0 : 0;
    current.publicReviews += row.source === "public" ? row.totalReviews || 0 : 0;
    map.set(row._id, current);
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      averageRating: roundRating(row.ratingSum / (row.totalReviews || 1)),
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.totalReviews - a.totalReviews);
};

// ========================================
// PHASE 5: HOSTEL / ROOM RATING ANALYTICS
// Read-only endpoint. Does not change existing feedback submission/list flows.
// ========================================
export const getFeedbackAnalytics = async (req, res) => {
  try {
    const settings = await getSystemSettings({ fresh: true });
    if (settings?.operations?.enableHostelRatings === false) {
      return res.status(403).json({
        success: false,
        message: "Hostel ratings analytics are currently disabled.",
      });
    }

    const scopedHostel = getRoleScopedHostel(req, req.query.hostel);
    const internalMatch = {
      ...(scopedHostel ? { hostel: scopedHostel } : {}),
      ...buildDateFilter(req.query, "submittedAt"),
    };
    const publicMatch = {
      ...(scopedHostel ? { hostel: scopedHostel } : {}),
      ...buildDateFilter(req.query, "submittedAt"),
    };

    const [publicHostels, roomRankings, publicTrends] = await Promise.all([
      GuestFeedback.aggregate([
        { $match: publicMatch },
        {
          $group: {
            _id: "$hostel",
            totalReviews: { $sum: 1 },
            ratingSum: { $sum: "$rating" },
          },
        },
        { $addFields: { source: "public" } },
      ]),
      Feedback.aggregate([
        { $match: internalMatch },
        {
          $group: {
            _id: { hostel: "$hostel", roomNo: "$roomNo" },
            totalReviews: { $sum: 1 },
            averageRating: { $avg: "$rating" },
          },
        },
        {
          $project: {
            _id: 0,
            hostel: "$_id.hostel",
            roomNo: "$_id.roomNo",
            totalReviews: 1,
            averageRating: { $round: ["$averageRating", 2] },
          },
        },
        { $sort: { averageRating: -1, totalReviews: -1 } },
        { $limit: 20 },
      ]),
      GuestFeedback.aggregate([
        { $match: publicMatch },
        {
          $group: {
            _id: {
              year: { $year: "$submittedAt" },
              month: { $month: "$submittedAt" },
            },
            totalReviews: { $sum: 1 },
            ratingSum: { $sum: "$rating" },
          },
        },
      ]),
    ]);

    const hostelRankings = mergeHostelRows([], publicHostels);
    const totalReviews = hostelRankings.reduce((sum, row) => sum + row.totalReviews, 0);
    const totalRatingSum = hostelRankings.reduce((sum, row) => sum + row.ratingSum, 0);

    const trendMap = new Map();
    for (const row of publicTrends) {
      const key = `${row._id.year}-${String(row._id.month).padStart(2, "0")}`;
      const current = trendMap.get(key) || { period: key, totalReviews: 0, ratingSum: 0 };
      current.totalReviews += row.totalReviews || 0;
      current.ratingSum += row.ratingSum || 0;
      trendMap.set(key, current);
    }

    const ratingTrends = Array.from(trendMap.values())
      .map((row) => ({
        period: row.period,
        totalReviews: row.totalReviews,
        averageRating: roundRating(row.ratingSum / (row.totalReviews || 1)),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      success: true,
      analytics: {
        averageHostelRating: roundRating(totalRatingSum / (totalReviews || 1)),
        averageRoomRating: roundRating(
          roomRankings.reduce((sum, row) => sum + row.averageRating * row.totalReviews, 0) /
            (roomRankings.reduce((sum, row) => sum + row.totalReviews, 0) || 1)
        ),
        totalReviews,
        topRatedHostel: hostelRankings[0] || null,
        mostReviewedHostel: [...hostelRankings].sort((a, b) => b.totalReviews - a.totalReviews)[0] || null,
        hostelRankings,
        roomRankings,
        ratingTrends,
      },
    });
  } catch (err) {
    console.error("❌ Feedback analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback analytics",
      error: err.message,
    });
  }
};
