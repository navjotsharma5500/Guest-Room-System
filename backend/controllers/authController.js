// controllers/authController.js
// ✅ FIXED: System Access is separate from Login success
import User from "../models/User.js";
import NightStudent from "../models/NightStudent.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEmail } from "../emails/sendEmail.js";

const STAFF_ROLES = ["admin", "adosa", "manager", "warden", "caretaker", "assistant", "dd_assistant", "guard", "co_warden"];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve Night Pass access for a user
// ─────────────────────────────────────────────────────────────────────────────
const resolveNightPassAccess = async (user) => {
  const role = (user.role || "").toLowerCase();

  // 1. Staff roles always have system access
  if (STAFF_ROLES.includes(role)) {
    return { allowed: true, role: user.role, societies: user.societies || [] };
  }

  // 2. President / Gen Sec must exist in NightStudent master AND be active
  if (role === "president" || role === "gen_sec") {
    const student = await NightStudent.findOne({
      email: { $regex: new RegExp(`^${user.email}$`, "i") },
    });
    if (!student || !student.isActive) {
      return {
        allowed: false,
        code: "NO_SYSTEM_ACCESS",
        message:
          "Your account exists, but you are not added to system data. Please contact the administrator.",
      };
    }
    return {
      allowed: true,
      role: user.role,
      rollNo: student.rollNo,
      societies: user.societies || [],
    };
  }

  // 3. All other non-staff users must be in the NightStudent master list
  const student = await NightStudent.findOne({
    email: { $regex: new RegExp(`^${user.email}$`, "i") },
  });

  if (!student || !student.isActive) {
    return {
      allowed: false,
      code: "NO_SYSTEM_ACCESS",
      message:
        "Your account exists, but you are not added to system data. Please contact the administrator.",
    };
  }

  // ✅ CRITICAL: Blocked defaulters cannot log in
  if (student.isDefaulter) {
    return {
      allowed: false,
      code: "STUDENT_DEFAULTER",
      message:
        "Your account is blocked due to a night pass violation. Please contact ADOSA.",
    };
  }

  return {
    allowed: true,
    role: "student",
    rollNo: student.rollNo,
    societies: user.societies || [],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: compute login redirect based on role
// ─────────────────────────────────────────────────────────────────────────────
const getLoginRedirect = (role, user = null) => {
  const r = (role || "").toLowerCase();
  const email = (user?.email || "").toLowerCase();
  const permissions = user?.permissions || {};
  if (email === "adosa2@thapar.edu") return "/dashboard";
  if (r === "guard") return "/night-pass/scan";
  if (permissions.guestRoom && !permissions.venue && !permissions.night) return "/dashboard";
  if (["manager", "warden", "co_warden"].includes(r)) return "/dashboard";
  if (r === "student" || ["president", "gen_sec"].includes(r)) return "/night-pass";
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

    // ✅ CHECK SYSTEM ACCESS (separate from credential check)
    const access = await resolveNightPassAccess(user);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        code: access.code,
        message: access.message,
      });
    }

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

    userObj.night = {
      role: (access.role || "").toUpperCase(),
      rollNo: access.rollNo,
      societies: access.societies || [],
    };

    // ✅ Include redirect hint for frontend
    userObj.redirectTo = getLoginRedirect(access.role, userObj);

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

    // ✅ CHECK SYSTEM ACCESS
    const access = await resolveNightPassAccess(user);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        code: access.code,
        message: access.message,
      });
    }

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

    userObj.night = {
      role: (access.role || "").toUpperCase(),
      rollNo: access.rollNo,
      societies: access.societies || [],
    };

    userObj.redirectTo = getLoginRedirect(access.role, userObj);

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
// GET ME (Cookie Auth) — resolves Night Pass access on every request
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Not logged in" });

    const user = await User.findById(req.user._id).select("-password");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const access = await resolveNightPassAccess(user);

    // ✅ If access was revoked after login, return 403
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        code: access.code,
        message: access.message,
      });
    }

    const userObj = user.toObject();
    delete userObj.password;

    userObj.night = {
      role: (access.role || "").toUpperCase(),
      rollNo: access.rollNo,
      societies: access.societies || [],
    };

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
