// controllers/guestFeedbackControllerUpgraded.js
import GuestFeedback from "../models/GuestFeedback.js";

// Helper: Get rating label from stars
const getRatingLabel = (stars) => {
  const labels = {
    1: "Poor",
    2: "Below Average",
    3: "Average",
    4: "Good",
    5: "Excellent",
  };
  return labels[stars] || "Average";
};

// ========================================
// SUBMIT GUEST FEEDBACK (Public) - UPGRADED
// ========================================
export const submitGuestFeedback = async (req, res) => {
  try {
    const { 
      name, 
      contact, 
      email, 
      hostel, 
      rating, 
      description, 
      profilePictureUrl,
      googleAuthMetadata,
      submittedAt 
    } = req.body;

    console.log("📝 Guest feedback submission (upgraded):", {
      name,
      email,
      hostel,
      rating,
      hasProfilePicture: !!profilePictureUrl,
      hasGoogleAuth: !!googleAuthMetadata,
    });

    // Validation
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!contact?.trim() || !/^[0-9]{10}$/.test(contact)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10-digit contact number is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid email address is required",
      });
    }

    if (!hostel) {
      return res.status(400).json({
        success: false,
        message: "Hostel selection is required",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5 stars",
      });
    }

    const ratingLabel = getRatingLabel(rating);

    const feedbackData = {
      name: name.trim(),
      contact: contact.trim(),
      email: email.trim().toLowerCase(),
      hostel,
      rating,
      ratingLabel,
      description: description?.trim() || "",
      profilePictureUrl: profilePictureUrl?.trim() || "",
      googleAuthMetadata: googleAuthMetadata || {},
      submittedAt: submittedAt || new Date(),
      status: "pending",
    };

    const feedback = await GuestFeedback.create(feedbackData);
    console.log("✅ Guest feedback created:", feedback._id);

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('guest-feedback-submitted', {
        feedbackId: feedback._id,
        hostel,
        rating,
        hasProfilePicture: !!profilePictureUrl,
        timestamp: Date.now()
      });
      console.log('📡 Emitted guest-feedback-submitted event');
    }

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback,
    });

  } catch (err) {
    console.error("❌ Submit guest feedback error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: err.message,
    });
  }
};

// ========================================
// GET ALL GUEST FEEDBACKS (Protected - Role-based)
// ========================================
export const getAllGuestFeedbacks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      hostel,
      rating,
      status,
      search,
      startDate,
      endDate,
    } = req.query;

    console.log("📋 Fetching guest feedbacks:", {
      page,
      limit,
      hostel,
      rating,
      status,
      userId: req.user?._id,
      role: req.user?.role,
    });

    // Build filter
    const filter = {};

    // Role-based filtering
    if (req.user.role === "caretaker" || req.user.role === "warden") {
      const assignedHostel = req.user.assignedHostel || req.user.hostel;
      if (!assignedHostel) {
        return res.status(400).json({
          success: false,
          message: "No hostel assigned to caretaker/warden",
        });
      }
      filter.hostel = assignedHostel;
      console.log("🔒 Restricted to hostel:", assignedHostel);
    }

    // Hostel filter (admin/manager)
    if (hostel && req.user.role !== "caretaker" && req.user.role !== "warden") {
      filter.hostel = hostel;
    }

    // Rating filter
    if (rating) {
      filter.rating = Number(rating);
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Search by name, email, or contact
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) filter.submittedAt.$lte = new Date(endDate);
    }

    console.log("🔍 Filter:", JSON.stringify(filter, null, 2));

    // Count total
    const total = await GuestFeedback.countDocuments(filter);

    // Fetch feedbacks with pagination
    const feedbacks = await GuestFeedback.find(filter)
      .sort({ submittedAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    console.log(`✅ Found ${feedbacks.length} guest feedbacks (total: ${total})`);

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
    console.error("❌ Get guest feedbacks error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch guest feedbacks",
      error: err.message,
    });
  }
};

// ========================================
// GET SINGLE GUEST FEEDBACK
// ========================================
export const getGuestFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await GuestFeedback.findById(id).lean();

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    // Check role-based access
    if (req.user.role === "caretaker" || req.user.role === "warden") {
      const assignedHostel = req.user.assignedHostel || req.user.hostel;
      if (feedback.hostel !== assignedHostel) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this feedback",
        });
      }
    }

    res.json({
      success: true,
      feedback,
    });

  } catch (err) {
    console.error("❌ Get guest feedback error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
      error: err.message,
    });
  }
};

// ========================================
// UPDATE GUEST FEEDBACK STATUS (Admin/Manager only)
// ========================================
export const updateGuestFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only admins and managers can update feedback status",
      });
    }

    const feedback = await GuestFeedback.findByIdAndUpdate(
      id,
      {
        status,
        adminNotes: adminNotes || "",
      },
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    console.log("✅ Guest feedback status updated:", id);

    res.json({
      success: true,
      message: "Feedback status updated",
      feedback,
    });

  } catch (err) {
    console.error("❌ Update guest feedback error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update feedback",
      error: err.message,
    });
  }
};

// ========================================
// DELETE GUEST FEEDBACK (Admin only)
// ========================================
export const deleteGuestFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete feedback",
      });
    }

    const feedback = await GuestFeedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    console.log("✅ Guest feedback deleted:", id);

    res.json({
      success: true,
      message: "Feedback deleted successfully",
    });

  } catch (err) {
    console.error("❌ Delete guest feedback error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete feedback",
      error: err.message,
    });
  }
};

// ========================================
// GET GUEST FEEDBACK STATISTICS
// ========================================
export const getGuestFeedbackStats = async (req, res) => {
  try {
    const { hostel } = req.query;

    const filter = {};

    // Role-based filtering
    if (req.user.role === "caretaker" || req.user.role === "warden") {
      filter.hostel = req.user.assignedHostel || req.user.hostel;
    } else if (hostel) {
      filter.hostel = hostel;
    }

    const stats = await GuestFeedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const statusBreakdown = await GuestFeedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // âœ… NEW: Profile picture stats
    const profilePictureStats = await GuestFeedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          withPicture: {
            $sum: {
              $cond: [{ $ne: ["$profilePictureUrl", ""] }, 1, 0]
            }
          },
          withoutPicture: {
            $sum: {
              $cond: [{ $eq: ["$profilePictureUrl", ""] }, 1, 0]
            }
          }
        }
      }
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const avgRating = stats.reduce((sum, s) => sum + s._id * s.count, 0) / (total || 1);

    res.json({
      success: true,
      stats: {
        total,
        average: Number(avgRating.toFixed(2)),
        ratingBreakdown: stats.map(s => ({
          rating: s._id,
          count: s.count,
          percentage: Number(((s.count / total) * 100).toFixed(1)),
        })),
        statusBreakdown: statusBreakdown.reduce((acc, s) => {
          acc[s._id] = s.count;
          return acc;
        }, {}),
        profilePictures: profilePictureStats[0] || {
          withPicture: 0,
          withoutPicture: 0
        }
      },
    });

  } catch (err) {
    console.error("❌ Get guest feedback stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: err.message,
    });
  }
};
