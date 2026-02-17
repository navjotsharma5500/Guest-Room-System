// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token = null;
  let tokenSource = null;

  // 1️⃣ Mobile auth (Authorization header)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
    tokenSource = "header";
    console.log("🔐 Using token from Authorization header");
  }

  // 2️⃣ Web auth (HttpOnly cookie)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
    tokenSource = "cookie";
    console.log("🔐 Using token from cookie");
  }

  console.log("🔐 Auth check - Path:", req.path);
  console.log("🔐 Token source:", tokenSource);

  if (!token) {
    console.log("❌ No token found");
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    console.log("🔐 Verifying token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.log("❌ User not found");

      if (tokenSource === "cookie") {
        res.clearCookie("token", {
          httpOnly: true,
          sameSite: "none",
          domain: ".guestapp.in",
          secure: true,
          path: "/",
        });
      }

      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedHostel: user.assignedHostel || user.hostel || null,
      isActive: user.isActive,
    };

    console.log("✅ Auth success:", req.user.email);
    next();

  } catch (error) {
    console.error("🔴 JWT Verification Error:", error.message);

    if (tokenSource === "cookie") {
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "none",
        domain: ".guestapp.in",
        secure: true,
        path: "/",
      });
    }

    return res.status(401).json({
      message: "Token invalid",
      details: error.message,
    });
  }
};
