// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token = req.cookies?.token;

  console.log("🔐 Auth check - Path:", req.path);
  console.log("🔐 Cookie token exists:", !!token);
  console.log("🔐 Auth header exists:", !!req.headers.authorization);

  // ✅ Check Authorization header if no cookie token
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace("Bearer ", "");
    console.log("🔐 Using token from Authorization header");
  }

  if (!token) {
    console.log("❌ No token found in cookies or headers");
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    console.log("🔐 Verifying token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded successfully:", decoded.id);

    // Fetch user WITHOUT password
    let user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.log("❌ User not found for ID:", decoded.id);
      // User not found → remove cookie
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        path: "/",
      });
      return res.status(401).json({ message: "User not found" });
    }

    console.log("✅ User found:", user.email);

    // ⭐ IMPORTANT FIX — map `hostel` → `assignedHostel`  
    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedHostel: user.assignedHostel || user.hostel || null,
      isActive: user.isActive,
    };

    console.log("✅ req.user set:", req.user._id);
    next();
    
  } catch (error) {
    console.error("🔴 JWT Verification Error:", error.message);
    console.error("🔴 Token received:", token?.substring(0, 30) + "...");
    
    // Invalid or expired token → clear cookie
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });

    return res.status(401).json({ 
      message: "Token invalid", 
      details: error.message 
    });
  }
};