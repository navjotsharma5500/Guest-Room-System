import mongoose from "mongoose";

mongoose.set("strictQuery", true);

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  if (!process.env.MONGO_URL) {
    console.error("❌ MONGO_URL environment variable is not set!");
    throw new Error("MongoDB URL not configured");
  }

  const urlPreview = process.env.MONGO_URL.substring(0, 30) + "...";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      console.log(`🔍 Connecting to MongoDB... (attempt ${attempt}/${MAX_RETRIES})`);
      console.log("📌 Using URL:", urlPreview);

      await mongoose.connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,

        maxPoolSize: 10,
        minPoolSize: 2,

        retryWrites: true,
        retryReads: true,

        family: 4,
      });

      console.log("🟢 MongoDB Connected Successfully 🚀");
      console.log("📊 Database:", mongoose.connection.name);
      return mongoose.connection;
    } catch (error) {
      console.error("🔴 MongoDB Connection Failed:", error.message);
      console.error("🔴 Full error:", error.stack);

      if (
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("querySrv")
      ) {
        console.error("💡 TIP: Check the MongoDB Atlas cluster hostname in MONGO_URL. The SRV record is not resolving correctly.");
      } else if (error.message.includes("authentication failed")) {
        console.error("💡 TIP: Check your MongoDB username and password");
      } else if (error.message.includes("timeout")) {
        console.error("💡 TIP: Check network access / Atlas IP allowlist");
      }

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      console.log(`⏳ Retrying connection in ${RETRY_DELAY_MS / 1000} seconds...`);
      await wait(RETRY_DELAY_MS);
    }
  }

  throw new Error("MongoDB connection retries exhausted");
};

export default connectDB;
