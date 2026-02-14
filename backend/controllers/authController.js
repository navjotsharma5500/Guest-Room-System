// controllers/authController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto"; // ✅ Import crypto
import { createLog } from "../middleware/logMiddleware.js";
import { sendEmail } from "../emails/sendEmail.js"; // ✅ Import sendEmail

// ==================================================
// LOGOUT USER
// ==================================================
export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// ==================================================
// LOGIN USER
// ==================================================
export const loginUser = async (req, res) => {
  try {
    console.log("📩 LOGIN HIT");
    console.log("📧 Email:", req.body.email);
    console.log("🌍 Origin:", req.headers.origin);

    const user = await User.findOne({ email: req.body.email });
    console.log("👤 User found:", !!user);

    if (!user) {
      console.log("❌ Email not found");
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      console.log("❌ Wrong password");
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    console.log("✅ Login successful");

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

    return res.json({
      success: true,
      token: token, // 🔥 Also return token in response so frontend can store it
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,

        // ⭐ FIX: guarantee sidebar always receives assignedHostel
        assignedHostel: user.assignedHostel || user.hostel || null,
      },
    });

  } catch (error) {
    console.error("🔥 LOGIN ERROR:", error);
    console.error("🔥 Stack trace:", error.stack);
    return res.status(500).json({ 
      success: false, 
      message: "Server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ==================================================
// GOOGLE LOGIN
// ==================================================
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: "No token provided" });
    }

    // Verify Google Token
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const googleData = await googleRes.json();

    if (googleData.error || !googleData.email) {
      return res.status(400).json({ success: false, message: "Invalid Google Token" });
    }

    const { email, name, picture } = googleData;
    console.log("ðŸ“§ Google Login Email:", email);

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // ❌ Access Denied if user is not pre-registered in the database
      return res.status(404).json({ 
        success: false, 
        message: "Access denied. Your email is not registered in our system." 
      });
    }

    // ✅ Enforce Thapar Email Domain
    if (!email.endsWith("@thapar.edu")) {
       return res.status(403).json({ 
         success: false, 
         message: "Access denied. Only @thapar.edu emails are allowed." 
       });
    }

    // Generate Session Token
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

    return res.json({
      success: true,
      token: jwtToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedHostel: user.assignedHostel || user.hostel || null,
        profilePicture: user.profilePicture
      },
    });

  } catch (error) {
    console.error("ðŸ”¥ GOOGLE LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================================================
// CREATE USER
// ==================================================
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
      assignedHostel: (role === "caretaker" || role === "warden") ? assignedHostel : null,
    });

    createLog("user_created", req.user?._id, { newUser: newUser._id });

    res.json({ message: "User created", user: newUser });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==================================================
// GET PROFILE
// ==================================================
export const getProfile = async (req, res) => {
  res.json(req.user);
};

// ==================================================
// UPDATE PROFILE
// ==================================================
export const updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const { name, hostel, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (hostel !== undefined) {
      // For caretakers, update assignedHostel; for others, update hostel
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
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ==================================================
// FORGOT PASSWORD
// ==================================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate Reset Token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and save to DB
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Create Reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>You have requested to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        html: message,
      });

      res.status(200).json({ success: true, message: "Email sent" });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({ success: false, message: "Email could not be sent" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================================================
// RESET PASSWORD
// ==================================================
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

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    // Set new password
    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================================================
// GET LOGGED-IN USER (Cookie Auth)
// ==================================================
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const user = await User.findById(req.user._id).select(
      "name email role assignedHostel hostel profilePicture"
    );

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,

        // ⭐ FIX: unify hostel field for sidebar
        assignedHostel: user.assignedHostel || user.hostel || null,
      },
    });

  } catch (error) {
    console.error("GET ME ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
