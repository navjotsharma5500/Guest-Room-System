import TokenRequest from "../models/TokenRequest.js";
import crypto from "crypto";
import { createLog } from "../middleware/logMiddleware.js";

// ================================
// REQUEST TOKEN
// ================================
export const requestToken = async (req, res) => {
  try {
    const { guestEmail, guestName, reason } = req.body;

    if (!guestEmail || !guestName || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const tokenReq = await TokenRequest.create({
      guestEmail,
      guestName,
      reason,
    });

    createLog("token_requested", null, { tokenReq: tokenReq._id });

    res.json({
      message: "Token request submitted",
      tokenReq,
    });

  } catch (err) {
    console.error("Token Request Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ================================
// APPROVE TOKEN
// ================================
export const approveToken = async (req, res) => {
  try {
    const tokenReq = await TokenRequest.findById(req.params.id);

    if (!tokenReq) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Mark approved
    tokenReq.approved = true;
    tokenReq.approvedBy = req.user._id;

    // Generate unique 8-digit HEX token (uppercase)
    tokenReq.token = crypto.randomBytes(4).toString("hex").toUpperCase();

    await tokenReq.save();

    // Log the approval
    createLog("token_approved", req.user._id, {
      requestId: tokenReq._id,
      token: tokenReq.token,
    });

    // Send email to guest
    await sendTokenApprovalEmail(tokenReq.guestEmail, tokenReq.token);

    res.json({
      message: "Token approved",
      tokenReq,
    });

  } catch (err) {
    console.error("Approve Token Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ================================
// GET ALL TOKEN REQUESTS
// ================================
export const getTokenRequests = async (req, res) => {
  try {
    const requests = await TokenRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
