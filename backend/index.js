// index.js - FIXED IMPORT ERROR

import "dotenv/config";
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
import { 
  startNoShowCronJob, 
  startAutoUnblockCronJob, 
  startAutoCheckoutCronJob, 
  startVenueAutoCompletionCronJob,
  startExtensionAutoCancelCronJob
} from "./utils/cronJobs.js";
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
import feedbackRoutes from "./routes/feedbackRoutes.js";
import guestFeedbackRoutes from "./routes/guestFeedbackRoutes.js";
import departmentPaymentRoutes from "./routes/departmentPaymentRoutes.js";
import extensionRoutes from "./routes/extensionRoutes.js";
import venueBookingRoutes from "./routes/VenueBookingRoutes.js";
import venueEnquiryRoutes from "./routes/venueEnquiryRoutes.js";
import eventCalendarRoutes from "./routes/eventCalendarRoutes.js";
import { seedDefaultSocietySuggestions } from "./models/SocietyNameSuggestion.js";
import { seedDefaultEventSuggestions } from "./models/EventNameSuggestion.js";
import uploadRoutes from './routes/uploadRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import awsAnalyticsRoutes from "./routes/awsAnalyticsRoutes.js";
import publicUiConfigRoutes from "./routes/publicUiConfigRoutes.js";

const app = express();

/* =========================================================
   ALLOWED ORIGINS
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

  // Backend
  "https://api.guestapp.in",

  // Old Vercel
  "https://guestroom.vercel.app",
];

console.log("ðŸŒ Allowed origins:", allowedOrigins);

/* =========================================================
   ORIGIN RESOLVER
========================================================= */
const resolveOrigin = (origin) => {
  console.log("ðŸ” Checking origin:", origin || "none");
  
  if (!origin) {
    console.log("âš ï¸ No origin header - same-origin or server request");
    return "https://www.guestapp.in";
  }
  
  if (allowedOrigins.includes(origin)) {
    console.log("âœ… Allowed origin (exact match):", origin);
    return origin;
  }
  
  if (origin.endsWith(".vercel.app")) {
    console.log("âœ… Vercel deployment:", origin);
    return origin;
  }
  
  if (origin.includes(".onrender.com")) {
    console.log("âœ… Render origin:", origin);
    return origin;
  }
  
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    console.log("âœ… Localhost development:", origin);
    return origin;
  }
  
  console.warn("âš ï¸ Unknown origin (allowing):", origin);
  return origin;
};

/* =========================================================
   PUBLIC STATIC FILES
========================================================= */
app.use(express.static("public"));

/* =========================================================
   HTTP SERVER + SOCKET.IO
========================================================= */
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const resolvedOrigin = resolveOrigin(origin);
      console.log("ðŸ”Œ Socket.IO Origin:", origin, "â†’", resolvedOrigin);
      callback(null, resolvedOrigin);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

console.log("ðŸ”Œ Socket.IO initialized with CORS support");

app.set("io", io);
setSocketIO(io);
global.io = io;


/* =========================================================
   HANDLE OPTIONS PREFLIGHT FIRST
========================================================= */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    const allowedOrigin = resolveOrigin(origin);

    console.log("ðŸ”¥ OPTIONS preflight:", req.path, "from", origin);

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
   GLOBAL CORS MIDDLEWARE
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
   IMAGEKIT CONFIG
========================================================= */
let imagekitServer = null;

try {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    console.warn("âš ï¸ ImageKit credentials missing - uploads will be disabled");
    console.warn("   PUBLIC_KEY:", publicKey ? "âœ“" : "âœ—");
    console.warn("   PRIVATE_KEY:", privateKey ? "âœ“" : "âœ—");
    console.warn("   URL_ENDPOINT:", urlEndpoint ? "âœ“" : "âœ—");
  } else {
    imagekitServer = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
    console.log("âœ… ImageKit initialized successfully");
  }
} catch (err) {
  console.error("âŒ ImageKit initialization failed:", err.message);
  console.warn("âš ï¸ Continuing without ImageKit - file uploads disabled");
}

/* =========================================================
   IMAGEKIT AUTH ROUTE
========================================================= */
app.get("/api/imagekit/auth", (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigin = resolveOrigin(origin);

  console.log("ðŸ“¸ ImageKit auth request");
  console.log("ðŸ“ Origin:", origin || "none");
  console.log("ðŸ“ Method:", req.method);
  console.log("ðŸ“ User-Agent:", req.headers["user-agent"]?.substring(0, 50));

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With, Cookie"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-cache");

  if (req.method === "OPTIONS") {
    console.log("âœ… ImageKit auth OPTIONS preflight handled");
    return res.status(200).end();
  }

  try {
    if (!imagekitServer) {
      console.error("âŒ ImageKit not initialized");
      return res.status(503).json({
        error: "ImageKit service unavailable",
        message: "File upload service is not configured"
      });
    }

    const result = imagekitServer.getAuthenticationParameters();
    
    console.log("âœ… ImageKit auth generated:", {
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
    console.error("âŒ ImageKit auth error:", err);
    console.error("âŒ Stack:", err.stack);
    
    res.status(500).json({
      error: "ImageKit authentication failed",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

/* =========================================================
   IMAGEKIT SEARCH ROUTE
========================================================= */
app.get("/api/imagekit/search", async (req, res) => {
  try {
    if (!imagekitServer) {
      return res.status(503).json({
        success: false,
        error: "ImageKit service unavailable",
        message: "File search service is not configured",
      });
    }

    const fileName = String(req.query.fileName || "").trim();
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: "fileName query param is required",
      });
    }

    const escapeSearchValue = (value) =>
      value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const safeName = escapeSearchValue(fileName);
    const searchQueries = [
      `name = "${safeName}"`,
      `name ~ "${safeName}"`,
    ];

    let files = [];
    let lastError = null;

    for (const searchQuery of searchQueries) {
      try {
        const result = await imagekitServer.listFiles({
          searchQuery,
          limit: 1,
          skip: 0,
        });

        if (Array.isArray(result)) {
          files = result;
        } else if (Array.isArray(result?.data)) {
          files = result.data;
        } else if (Array.isArray(result?.files)) {
          files = result.files;
        } else {
          files = [];
        }

        if (files.length > 0) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!files || files.length === 0) {
      if (lastError) {
        console.warn("⚠️ ImageKit search failed:", lastError.message);
      }
      return res.json({
        success: false,
        message: "No matching files found",
      });
    }

    const file = files[0];
    return res.json({
      success: true,
      url: file.url,
      fileId: file.fileId,
      name: file.name,
      filePath: file.filePath,
    });
  } catch (err) {
    console.error("❌ ImageKit search error:", err);
    return res.status(500).json({
      success: false,
      message: "ImageKit search failed",
      error: err.message,
    });
  }
});

/* =========================================================
   REQUEST LOGGING MIDDLEWARE
========================================================= */
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`ðŸ“¥ ${timestamp} | ${req.method} ${req.path}`);
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
  res.send("Guest Room Backend Running Successfully ðŸ¨");
});

/* =========================================================
   API ROUTES
========================================================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/extensions", extensionRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use("/api/venue-bookings", venueBookingRoutes);
app.use("/api/venue/enquiry", venueEnquiryRoutes);
app.use("/api/events", eventCalendarRoutes);
app.use("/api/event-calendar", eventCalendarRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/test", testRoutes);
app.use("/api/defaulters", defaulterRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/guest-feedback", guestFeedbackRoutes);
app.use("/api/department-payments", departmentPaymentRoutes);
app.use("/api/payments", paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use("/api/analytics", awsAnalyticsRoutes);
app.use("/api/public-ui", publicUiConfigRoutes);

console.log("✅ Payment routes mounted at /api/payments");
console.log("✅ Guest feedback routes mounted at /api/guest-feedback");
console.log('✅ Guest room routes registered at /api/bookings (isolated)');
console.log('✅ Unified booking routes registered at /api/unified-bookings (optional)');

/* =========================================================
   SOCKET.IO HANDLER
========================================================= */
io.on("connection", (socket) => {
  console.log("âœ… Socket connected:", socket.id);

  socket.on("join-dashboard", () => {
    socket.join("dashboard-room");
    socket.emit("connection-confirmed", {
      socketId: socket.id,
      message: "Connected to dashboard updates",
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("âŒ Socket disconnected:", socket.id, reason);
  });

  socket.onAny((event, ...args) => {
    console.log("ðŸ“¡ Socket event:", event, args);
  });
});

/* =========================================================
   ADMIN CLEANUP ENDPOINT
========================================================= */
app.get("/api/admin/cleanup-orphaned-enquiries", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }
    
    console.log("ðŸ§¹ Manual cleanup triggered by admin:", req.user.email);
    const result = await cleanupOrphanedEnquiries();
    
    res.json({
      ...result,
      triggeredBy: req.user.email,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("âŒ Cleanup endpoint error:", err);
    res.status(500).json({
      success: false,
      message: "Cleanup failed",
      error: err.message
    });
  }
});

/* =========================================================
   CLEANUP SCHEDULER
========================================================= */
const scheduleCleanupJob = () => {
  console.log("â° Scheduling orphaned enquiry cleanup job...");
  
  setTimeout(async () => {
    console.log("ðŸ§¹ Running initial orphaned enquiry cleanup...");
    try {
      await cleanupOrphanedEnquiries();
    } catch (err) {
      console.error("âŒ Initial cleanup failed:", err);
    }
  }, 10000);
  
  setInterval(async () => {
    console.log("â° Running scheduled orphaned enquiry cleanup...");
    try {
      await cleanupOrphanedEnquiries();
    } catch (err) {
      console.error("âŒ Scheduled cleanup failed:", err);
    }
  }, 60 * 60 * 1000);
};

/* =========================================================
   HEALTH CHECK API
========================================================= */
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

/* =========================================================
   SINGLE ERROR HANDLER
========================================================= */
app.use((err, req, res, next) => {
  console.error("âŒ Global Error Handler:");
  console.error("âŒ Path:", req.path);
  console.error("âŒ Method:", req.method);
  console.error("âŒ Error:", err.message);
  console.error("âŒ Stack:", err.stack);
  
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
  if (process.env.NODE_ENV === 'test') return;
  
  try {
    console.log("⏳ Connecting to MongoDB...");
    await connectDB();
    console.log("âœ… MongoDB connected");

    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB not connected after connectDB()");
    }

    await seedDefaultSocietySuggestions();
    console.log("âœ… Default society suggestions ensured");
    await seedDefaultEventSuggestions();
    console.log("âœ… Default event suggestions ensured");

    // âœ… FIXED: Pass io instance to cron jobs
    startNoShowCronJob(io);
    startAutoUnblockCronJob(io);
    startAutoCheckoutCronJob(io);
    startVenueAutoCompletionCronJob(io);
    startExtensionAutoCancelCronJob(io);
    scheduleCleanupJob();

    server.listen(PORT, () => {
      console.log(`ðŸ¨ Server running on port ${PORT}`);
      console.log(`ðŸ“± iOS Safari supported`);
      console.log(`ðŸŒ Allowed origins:`, allowedOrigins);
      console.log(`ðŸ”Œ Socket.IO ready`);
    });
  } catch (err) {
    console.error("âŒ Server startup failed:", err);
    process.exit(1);
  }
};

startServer();

export default app;

