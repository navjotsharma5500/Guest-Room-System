import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  console.log("🔒 PROTECT MIDDLEWARE HIT");
  console.log("📩 Incoming Path:", req.originalUrl);

  try {
    console.log("🍪 Cookies received:", req.cookies);
    console.log("🔍 Token from cookie:", req.cookies?.token);

    const token = req.cookies?.token;
    console.log("🔍 Extracted token:", token || "NO TOKEN FOUND");

    if (!token) {
      console.log("❌ REJECTED — No token in cookies");
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🧩 Decoded token:", decoded);

    // Fetch user
    const user = await User.findById(decoded.id).select("-password");
    console.log("👤 User lookup:", user ? "FOUND" : "NOT FOUND");

    if (!user) {
      console.log("❌ REJECTED — Token valid but user not found in DB");
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user to request
    req.user = user;

    console.log("✅ PROTECT SUCCESS — User authenticated:", user.email);
    next();

  } catch (err) {
    console.log("❌ PROTECT ERROR:", err.message);
    return res.status(401).json({ message: "Token invalid" });
  }
};
