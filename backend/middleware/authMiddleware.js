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
          domain: ".campusconnect.thapar.edu",
          secure: true,
          path: "/",
        });
      }

      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // ✅ Attach full original user object from DB
    
    // 🔐 SPECIAL OVERRIDE FOR adosa2@thapar.edu (OR anyone with permission overrides)
    // If user has 'guestRoom: true' permission but role is not in standard guest room roles,
    // we might need to pretend they are 'co_warden' for controllers that strictly check role.
    
    // Ideally, controllers should check permissions, but for legacy compatibility:
    if (user.permissions?.guestRoom === true && !["admin", "adosa", "manager", "warden", "caretaker", "assistant", "co_warden"].includes(user.role)) {
       console.log(`⚡ Permission Override: ${user.email} -> Treating as CO_WARDEN for Guest Room context`);
       req.user.originalRole = user.role;
       req.user.role = 'co_warden'; 
    }

    console.log("✅ Auth success:", req.user.email);
    next();

  } catch (error) {
    console.error("🔴 JWT Verification Error:", error.message);

    if (tokenSource === "cookie") {
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "none",
        domain: ".campusconnect.thapar.edu",
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

export const optionalProtect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    req.user = user || null;
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};
