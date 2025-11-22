import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";

// Load environment variables
dotenv.config();

const app = express();

// -----------------------------
// Middlewares
// -----------------------------
app.use(express.json());
app.use(morgan("dev"));

// CORS Settings
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// -----------------------------
// Database Connection
// -----------------------------
connectDB();

// -----------------------------
// Default Route
// -----------------------------
app.get("/", (req, res) => {
  res.send("Guest Room Backend Running Successfully 🚀");
});

// -----------------------------
// Import API Routes
// -----------------------------
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import hostelRoutes from "./routes/hostelRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

// -----------------------------
// Use API Routes
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/dashboard", dashboardRoutes);

// -----------------------------
// Error Handler (Must be last)
// -----------------------------
import { errorHandler } from "./middleware/errorMiddleware.js";
app.use(errorHandler);

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
