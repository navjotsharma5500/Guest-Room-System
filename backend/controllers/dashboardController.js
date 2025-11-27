import User from "../models/User.js";
import Enquiry from "../models/Enquiry.js";
import TokenRequest from "../models/TokenRequest.js";

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBookings = 0; // no booking model
    const totalEnquiries = await Enquiry.countDocuments();
    const pendingTokenRequests = await TokenRequest.countDocuments({
      approved: false,
    });
    const approvedTokenRequests = await TokenRequest.countDocuments({
      approved: true,
    });

    res.json({
      users: totalUsers,
      bookings: totalBookings,
      enquiries: totalEnquiries,
      tokens: {
        pending: pendingTokenRequests,
        approved: approvedTokenRequests,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
