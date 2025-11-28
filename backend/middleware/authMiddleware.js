// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token = null;

  try {
    // ===========================================
    // 1) Check HTTP-ONLY COOKIE (PRIMARY METHOD)
    // ===========================================
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // ===========================================
    // 2) Fallback to Bearer token (optional)
    // ===========================================
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ===========================================
    // No Token Found → 401
    // ===========================================
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }

    // ===========================================
    // VERIFY Token
    // ===========================================
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};
