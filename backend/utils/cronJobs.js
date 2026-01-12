import cron from "node-cron";
import { autoCancelNoShows } from "../controllers/bookingController.js";

export const startNoShowCronJob = (io) => {
  console.log("🕐 Starting no-show auto-cancel cron job...");
  
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running auto-cancel no-show job...`);
    
    try {
      const result = await autoCancelNoShows();
      console.log("✅ Auto-cancel completed:", result);
      
      // ✅ Notify all connected clients
      if (io) {
        io.emit("bookingDataUpdated", {
          type: "cron-auto-cancel",
          timestamp: now.toISOString(),
          result
        });
        console.log("📡 Broadcast update to all clients");
      }
      
    } catch (error) {
      console.error("❌ Auto-cancel error:", error);
    }
  });

  console.log("✅ Cron job started - runs every hour");
};