// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();

// ---------------------------------------------------
// MIDDLEWARE
// ---------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ---------------------------------------------------
// CORS (IMPORTANT for Cookies!!)
// ---------------------------------------------------
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://guest-room-dashboard.vercel.app",   // your frontend
    ],
    credentials: true,                             // allow cookies
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ❗ DO NOT ADD app.options("*", cors()) — breaks cookies on Vercel

// Logging
app.use(morgan("dev"));
app.use((req, res, next) => {
  console.log("🌍 REQUEST:", req.method, req.originalUrl);
  console.log("🔗 Origin:", req.headers.origin);
  console.log("🍪 Cookies received:", req.cookies);
  next();
});

// ---------------------------------------------------
// CONNECT DB
// ---------------------------------------------------
connectDB();

// ---------------------------------------------------
// ROUTES
// ---------------------------------------------------
app.get("/", (req, res) =>
  res.send("Guest Room Backend Running Successfully 🚀")
);

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import hostelRoutes from "./routes/hostelRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ---------------------------------------------------
// GLOBAL ERROR HANDLER
// ---------------------------------------------------
import { errorHandler } from "./middleware/errorMiddleware.js";
app.use(errorHandler);

// ---------------------------------------------------
// START SERVER
// ---------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
