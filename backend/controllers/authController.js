// controllers/authController.js
// ✅ FIXED: System Access is separate from Login success
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEmail } from "../emails/sendEmail.js";


// ─────────────────────────────────────────────────────────────────────────────
// Helper: compute login redirect based on role
// ─────────────────────────────────────────────────────────────────────────────
const getLoginRedirect = (role, user = null) => {
  const r = (role || "").toLowerCase();
  const email = (user?.email || "").toLowerCase();
  const permissions = user?.permissions || {};
  if (email === "adosa2@thapar.edu") return "/dashboard";
  if (r === "guard") return "/dashboard";
  if (permissions.guestRoom && !permissions.venue && !permissions.night) return "/dashboard";
  if (["manager", "warden", "co_warden"].includes(r)) return "/dashboard";
  if (r === "student" || ["president", "gen_sec"].includes(r)) return "/";
  if (["admin", "adosa", "assistant", "caretaker"].includes(r)) return "/admin/dashboard-selector";
  if (r === "dd_assistant") return "/venue-booking";
  return "/";
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const userObj = user.toObject();
    delete userObj.password;

    // ✅ Include redirect hint for frontend
    userObj.redirectTo = getLoginRedirect(user.role, userObj);

    return res.json({ success: true, token, user: userObj });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ success: false, message: "No token provided" });

    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    );
    const googleData = await googleRes.json();

    if (googleData.error || !googleData.email)
      return res.status(400).json({ success: false, message: "Invalid Google Token" });

    const { email } = googleData;

    if (!email.endsWith("@thapar.edu"))
      return res
        .status(403)
        .json({ success: false, message: "Only @thapar.edu emails are allowed." });

    let user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Your email is not registered in our system." });

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.cookie("token", jwtToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const userObj = user.toObject();
    delete userObj.password;

    userObj.redirectTo = getLoginRedirect(user.role, userObj);

    return res.json({ success: true, token: jwtToken, user: userObj });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE USER
// ─────────────────────────────────────────────────────────────────────────────
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, assignedHostel } = req.body;
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "User already exists" });

    const newUser = await User.create({
      name,
      email,
      password,
      role,
      assignedHostel:
        role === "caretaker" || role === "warden" ? assignedHostel : null,
    });

    createLog("user_created", req.user?._id, { newUser: newUser._id });
    res.json({ message: "User created", user: newUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  res.json(req.user);
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Not logged in" });

    const { name, hostel, profilePicture } = req.body;
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (name !== undefined) user.name = name;
    if (hostel !== undefined) {
      if (user.role === "caretaker" || user.role === "warden") {
        user.assignedHostel = hostel;
      } else {
        user.hostel = hostel;
      }
    }
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        assignedHostel: user.assignedHostel || user.hostel || null,
        hostel: user.hostel || user.assignedHostel || null,
      },
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ME (Cookie Auth)
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Not logged in" });

    const user = await User.findById(req.user._id).select("-password");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({ success: true, user: userObj });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
export const logoutUser = async (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, data: {} });
};

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    try {
      await sendEmail({ to: user.email, subject: "Password Reset Request", html: message });
      res.status(200).json({ success: true, message: "Email sent" });
    } catch {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ success: false, message: "Email could not be sent" });
    }
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ success: false, message: "Invalid or expired token" });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
