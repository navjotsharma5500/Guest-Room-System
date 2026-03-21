// config/db.js - UPDATED VERSION FOR MONGO_URL

import mongoose from "mongoose";

mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    console.log("🔍 Connecting to MongoDB...");
    
    // ✅ Validate MONGO_URL is set
    if (!process.env.MONGO_URL) {
      console.error("❌ MONGO_URL environment variable is not set!");
      console.error("Please add MONGO_URL in your Render environment variables");
      throw new Error("MongoDB URL not configured");
    }
    
    // ✅ Show partial URL (for security, hide credentials)
    const urlPreview = process.env.MONGO_URL.substring(0, 30) + "...";
    console.log("📌 Using URL:", urlPreview);

    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("🟢 MongoDB Connected Successfully 🚀");
    console.log("📊 Database:", mongoose.connection.name);
    
  } catch (error) {
    console.error("🔴 MongoDB Connection Failed:", error.message);
    console.error("🔴 Full error:", error.stack);

    // ✅ Better error messages
    if (error.message.includes("authentication failed")) {
      console.error("💡 TIP: Check your MongoDB username and password");
    } else if (error.message.includes("ENOTFOUND")) {
      console.error("💡 TIP: Check your MongoDB cluster URL");
    } else if (error.message.includes("timeout")) {
      console.error("💡 TIP: Check if MongoDB Atlas allows connections from Render IP");
    }

    // ✅ Retry logic
    console.log("⏳ Retrying connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;