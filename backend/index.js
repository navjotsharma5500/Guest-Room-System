import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import bodyParser from "body-parser";
import connectDB from "./config/db.js";

dotenv.config();
const app = express();

// -----------------------------
// Middlewares
// -----------------------------
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(bodyParser.json({ limit: "15mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "15mb" }));
app.use(morgan("dev"));

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// -----------------------------
// Connect DB
// -----------------------------
connectDB();

// -----------------------------
// Default Route
// -----------------------------
app.get("/", (req, res) => {
  res.send("Guest Room Backend Running Successfully 🚀");
});

// -----------------------------
// Routes
// -----------------------------
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import hostelRoutes from "./routes/hostelRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/hostels", hostelRoutes);        // BOOKINGS INCLUDED HERE
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/dashboard", dashboardRoutes);

// -----------------------------
// Error Handler
// -----------------------------
import { errorHandler } from "./middleware/errorMiddleware.js";
app.use(errorHandler);

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
