// index.js - FINAL iOS + DESKTOP + CLOUDFLARE + SOCKET.IO SAFE VERSION

import "dotenv/config";

// ✅ DEBUG: Verify environment variables loaded
console.log("🔍 Environment Check:");
console.log("   NODE_ENV:", process.env.NODE_ENV);
console.log("   PORT:", process.env.PORT);
console.log("   MONGO_URL:", process.env.MONGO_URL ? "✓ Loaded" : "✗ Missing");
console.log("   IMAGEKIT_PUBLIC_KEY:", process.env.IMAGEKIT_PUBLIC_KEY ? "✓ Loaded" : "✗ Missing");
console.log("   IMAGEKIT_PRIVATE_KEY:", process.env.IMAGEKIT_PRIVATE_KEY ? "✓ Loaded" : "✗ Missing");
console.log("   IMAGEKIT_URL_ENDPOINT:", process.env.IMAGEKIT_URL_ENDPOINT ? "✓ Loaded" : "✗ Missing");
console.log("   MANAGER_EMAIL:", process.env.MANAGER_EMAIL ? "✓ Loaded" : "✗ Missing");

import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import ImageKit from "imagekit";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { protect } from "./middleware/authMiddleware.js";
import { cleanupOrphanedEnquiries } from "./middleware/bookingSafetyMiddleware.js";
import { startNoShowCronJob } from "./utils/cronJobs.js";
import { setSocketIO } from "./utils/socket.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import hostelRoutes from "./routes/hostelRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import defaulterRoutes from "./routes/defaulterRoutes.js";

const app = express();

/* =========================================================
   ALLOWED ORIGINS - ✅ CRITICAL FIX: Added API domain
========================================================= */
const allowedOrigins = [
  // Local dev
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",

  // Frontend
  "https://guestapp.in",
  "https://www.guestapp.in",

  // Backend (IMPORTANT for Socket.IO & OPTIONS)
  "https://api.guestapp.in",

  // Old Vercel (safe to keep)
  "https://guestroom.vercel.app",
];

console.log("🌍 Allowed origins:", allowedOrigins);

/* =========================================================
   ORIGIN RESOLVER (CRITICAL iOS FIX)
========================================================= */
const resolveOrigin = (origin) => {
  // Log every origin for debugging
  console.log("🌍 Checking origin:", origin || "none");
  
  // iOS Safari sometimes sends no origin
  if (!origin) {
    console.log("⚠️ No origin header - same-origin or server request");
    return "https://www.guestapp.in";
  }
  
  // Check exact match
  if (allowedOrigins.includes(origin)) {
    console.log("✅ Allowed origin (exact match):", origin);
    return origin;
  }
  
  // Allow all Vercel deployments (production + previews)
  if (origin.endsWith(".vercel.app")) {
    console.log("✅ Vercel deployment:", origin);
    return origin;
  }
  
  // Allow Render internal calls
  if (origin.includes(".onrender.com")) {
    console.log("✅ Render origin:", origin);
    return origin;
  }
  
  // Allow localhost (development)
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    console.log("✅ Localhost development:", origin);
    return origin;
  }
  
  // Allow but warn
  console.warn("⚠️ Unknown origin (allowing):", origin);
  return origin;
};

/* =========================================================
   PUBLIC STATIC FILES (NO AUTH)
========================================================= */
app.use(express.static("public"));

/* =========================================================
   HTTP SERVER + SOCKET.IO - ✅ CRITICAL FIX: Return resolved origin
========================================================= */
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const resolvedOrigin = resolveOrigin(origin);
      console.log("🔌 Socket.IO Origin:", origin, "→", resolvedOrigin);
      callback(null, resolvedOrigin); // ✅ CRITICAL: Return string, not boolean
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // ✅ Support both transports
  allowEIO3: true, // ✅ Backward compatibility
});

console.log("🔌 Socket.IO initialized with CORS support");

app.set("io", io);
setSocketIO(io);

/* =========================================================
   ✅ CRITICAL FIX: Handle OPTIONS preflight FIRST
   This MUST come before any other middleware
========================================================= */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    const allowedOrigin = resolveOrigin(origin);

    console.log("🔄 OPTIONS preflight:", req.path, "from", origin);

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept, Cookie, X-Requested-With"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Type, Content-Length"
    );

    return res.status(204).end();
  }
  next();
});

/* =========================================================
   GLOBAL CORS MIDDLEWARE (SAFE FOR iOS + LOCALHOST)
========================================================= */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigin = resolveOrigin(origin);

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, Cookie, X-Requested-With"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Disposition, Content-Type, Content-Length"
  );

  next();
});

/* =========================================================
   IMAGEKIT CONFIG - SAFE INITIALIZATION
========================================================= */
let imagekitServer = null;

try {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    console.warn("⚠️ ImageKit credentials missing - uploads will be disabled");
    console.warn("   PUBLIC_KEY:", publicKey ? "✓" : "✗");
    console.warn("   PRIVATE_KEY:", privateKey ? "✓" : "✗");
    console.warn("   URL_ENDPOINT:", urlEndpoint ? "✓" : "✗");
  } else {
    imagekitServer = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
    console.log("✅ ImageKit initialized successfully");
  }
} catch (err) {
  console.error("❌ ImageKit initialization failed:", err.message);
  console.warn("⚠️ Continuing without ImageKit - file uploads disabled");
}

/* =========================================================
   IMAGEKIT AUTH ROUTE (✅ FIXED - Uses resolveOrigin)
========================================================= */
app.get("/api/imagekit/auth", (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigin = resolveOrigin(origin);

  console.log("🔐 ImageKit auth request");
  console.log("📋 Origin:", origin || "none");
  console.log("📋 Method:", req.method);
  console.log("📋 User-Agent:", req.headers["user-agent"]?.substring(0, 50));

  // Set CORS headers FIRST
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With, Cookie"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-cache");

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    console.log("✅ ImageKit auth OPTIONS preflight handled");
    return res.status(200).end();
  }

  try {
    // ✅ Check if ImageKit is initialized
    if (!imagekitServer) {
      console.error("❌ ImageKit not initialized");
      return res.status(503).json({
        error: "ImageKit service unavailable",
        message: "File upload service is not configured"
      });
    }

    // Generate auth parameters
    const result = imagekitServer.getAuthenticationParameters();
    
    console.log("✅ ImageKit auth generated:", {
      hasSignature: !!result.signature,
      hasToken: !!result.token,
      expire: result.expire
    });

    res.status(200).json({
      signature: result.signature,
      expire: result.expire,
      token: result.token,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    });
  } catch (err) {
    console.error("❌ ImageKit auth error:", err);
    console.error("❌ Stack:", err.stack);
    
    res.status(500).json({
      error: "ImageKit authentication failed",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

// ==========================================
// REQUEST LOGGING MIDDLEWARE
// ==========================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 ${timestamp} | ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.headers.origin || "none"}`);
  console.log(`   User-Agent: ${req.headers["user-agent"]?.substring(0, 60)}...`);
  next();
});

/* =========================================================
   CORE MIDDLEWARE
========================================================= */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

/* =========================================================
   HEALTH CHECK
========================================================= */
app.get("/", (req, res) => {
  res.send("Guest Room Backend Running Successfully 🚀");
});

/* =========================================================
   API ROUTES
========================================================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/test", testRoutes);
app.use("/api/defaulters", defaulterRoutes);
app.use("/api/payments", paymentRoutes);

console.log("✅ Payment routes mounted at /api/payments");

/* =========================================================
   SOCKET.IO HANDLER
========================================================= */
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("join-dashboard", () => {
    socket.join("dashboard-room");
    socket.emit("connection-confirmed", {
      socketId: socket.id,
      message: "Connected to dashboard updates",
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", socket.id, reason);
  });

  socket.onAny((event, ...args) => {
    console.log("📡 Socket event:", event, args);
  });
});

// ============================================
// ADMIN CLEANUP ENDPOINT
// ============================================
app.get("/api/admin/cleanup-orphaned-enquiries", protect, async (req, res) => {
  try {
    // Only allow admin users
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }
    
    console.log("🧹 Manual cleanup triggered by admin:", req.user.email);
    const result = await cleanupOrphanedEnquiries();
    
    res.json({
      ...result,
      triggeredBy: req.user.email,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Cleanup endpoint error:", err);
    res.status(500).json({
      success: false,
      message: "Cleanup failed",
      error: err.message
    });
  }
});

// ============================================
// CLEANUP SCHEDULER
// ============================================
const scheduleCleanupJob = () => {
  console.log("⏰ Scheduling orphaned enquiry cleanup job...");
  
  // Run first cleanup after 10 seconds (allow DB to fully initialize)
  setTimeout(async () => {
    console.log("🧹 Running initial orphaned enquiry cleanup...");
    try {
      await cleanupOrphanedEnquiries();
    } catch (err) {
      console.error("❌ Initial cleanup failed:", err);
    }
  }, 10000);
  
  // Then run every hour
  setInterval(async () => {
    console.log("⏰ Running scheduled orphaned enquiry cleanup...");
    try {
      await cleanupOrphanedEnquiries();
    } catch (err) {
      console.error("❌ Scheduled cleanup failed:", err);
    }
  }, 60 * 60 * 1000); // 1 hour
};

// ============================================
// HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

/* =========================================================
   ✅ SINGLE ERROR HANDLER (removed duplicate)
========================================================= */
app.use((err, req, res, next) => {
  console.error("❌ Global Error Handler:");
  console.error("❌ Path:", req.path);
  console.error("❌ Method:", req.method);
  console.error("❌ Error:", err.message);
  console.error("❌ Stack:", err.stack);
  
  // Set CORS headers even for errors
  const origin = req.headers.origin;
  const allowedOrigin = resolveOrigin(origin);
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

/* =========================================================
   START SERVER
========================================================= */
const PORT = process.env.PORT || 10000;

const startServer = async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected");

    startNoShowCronJob();
    scheduleCleanupJob(); // ✅ Start cleanup scheduler

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 iOS Safari supported`);
      console.log(`🌐 Allowed origins:`, allowedOrigins);
      console.log(`🔌 Socket.IO ready`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
};

startServer();

/* =========================================================
   EXPORT IO
========================================================= */
export { io };