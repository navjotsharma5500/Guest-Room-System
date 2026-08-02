import CampusFeedback from "../models/CampusFeedback.js";
import crypto from "crypto";

const MAX_DESCRIPTION_LENGTH = 2000;

export const submitCampusFeedback = async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    const description = String(req.body?.description || "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be an integer from 1 to 5." });
    }

    if (!description) {
      return res.status(400).json({ success: false, message: "Feedback description is required." });
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ success: false, message: `Feedback description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.` });
    }

    const submissionFingerprint = crypto
      .createHash("sha256")
      .update(`${req.user._id}:${rating}:${description.toLowerCase()}`)
      .digest("hex");
    const submissionWindow = Math.floor(Date.now() / (5 * 60 * 1000));

    const feedback = await CampusFeedback.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userPhoto: req.user.profilePicture || "",
      rating,
      description,
      status: "pending",
      submissionFingerprint,
      submissionWindow,
    });

    return res.status(201).json({
      success: true,
      feedback: { status: feedback.status, submittedAt: feedback.submittedAt },
      message: "Thank you for your feedback. It will appear publicly after approval.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "Thank you for your feedback. It will appear publicly after admin approval.",
      });
    }
    console.error("Campus feedback submission error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit feedback right now." });
  }
};

export const getCampusFeedbackAdmin = async (req, res) => {
  try {
    const status = String(req.query.status || "").trim().toLowerCase();
    const rating = Number(req.query.rating);
    const search = String(req.query.search || "").trim();
    const query = {};

    if (["pending", "approved", "rejected"].includes(status)) query.status = status;
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) query.rating = rating;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = ["userName", "userEmail", "description"].map((field) => ({
        [field]: { $regex: escaped, $options: "i" },
      }));
    }

    const feedback = await CampusFeedback.find(query)
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .select("-submissionFingerprint -submissionWindow")
      .sort({ submittedAt: -1 })
      .lean();

    return res.json({ success: true, feedback });
  } catch (error) {
    console.error("Campus feedback admin fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load campus feedback." });
  }
};

export const approveCampusFeedback = async (req, res) => {
  try {
    const feedback = await CampusFeedback.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: "approved", approvedAt: new Date(), approvedBy: req.user._id },
        $unset: { rejectedAt: 1, rejectedBy: 1 },
      },
      { new: true, runValidators: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: "Feedback not found." });
    return res.json({ success: true, feedback });
  } catch (error) {
    console.error("Campus feedback approval error:", error);
    return res.status(500).json({ success: false, message: "Unable to approve feedback." });
  }
};

export const rejectCampusFeedback = async (req, res) => {
  try {
    const feedback = await CampusFeedback.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: "rejected", rejectedAt: new Date(), rejectedBy: req.user._id },
        $unset: { approvedAt: 1, approvedBy: 1 },
      },
      { new: true, runValidators: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: "Feedback not found." });
    return res.json({ success: true, feedback });
  } catch (error) {
    console.error("Campus feedback rejection error:", error);
    return res.status(500).json({ success: false, message: "Unable to reject feedback." });
  }
};

export const deleteCampusFeedback = async (req, res) => {
  try {
    const feedback = await CampusFeedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: "Feedback not found." });
    return res.json({ success: true, message: "Feedback deleted." });
  } catch (error) {
    console.error("Campus feedback deletion error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete feedback." });
  }
};

export const getApprovedCampusFeedback = async (_req, res) => {
  try {
    const feedback = await CampusFeedback.find({ status: "approved" })
      .sort({ approvedAt: -1, submittedAt: -1 })
      .select("rating description -_id")
      .lean();

    return res.json({
      success: true,
      feedback: feedback.map((item) => ({
        rating: item.rating,
        description: item.description,
      })),
    });
  } catch (error) {
    console.error("Public campus feedback fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load feedback right now." });
  }
};
