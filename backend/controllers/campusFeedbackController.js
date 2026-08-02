import CampusFeedback from "../models/CampusFeedback.js";

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

    const feedback = await CampusFeedback.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userPhoto: req.user.profilePicture || "",
      rating,
      description,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      feedback: { status: feedback.status, submittedAt: feedback.submittedAt },
      message: "Thank you for your feedback. It will appear publicly after approval.",
    });
  } catch (error) {
    console.error("Campus feedback submission error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit feedback right now." });
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
