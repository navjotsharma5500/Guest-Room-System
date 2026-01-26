import cron from "node-cron";
import { autoCancelNoShows } from "../controllers/bookingController.js";
import Hostel from "../models/Hostel.js";

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

// ✅ NEW: Auto-unblock expired room blocks (runs daily at midnight)
export const startAutoUnblockCronJob = (io) => {
  console.log("🕐 Starting auto-unblock room cron job...");
  
  cron.schedule("0 0 * * *", async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running auto-unblock room job...`);
    
    try {
      now.setHours(0, 0, 0, 0);

      const hostels = await Hostel.find({});
      let unblocked = 0;

      for (const hostel of hostels) {
        let modified = false;

        for (const room of hostel.rooms) {
          if (room.isBlocked && room.blockedTill) {
            const blockedTill = new Date(room.blockedTill);
            blockedTill.setHours(0, 0, 0, 0);

            if (blockedTill < now) {
              console.log(`✅ Auto-unblocking: ${hostel.name} - Room ${room.roomNo}`);
              
              room.isBlocked = false;
              room.blockedTill = undefined;
              room.blockRemarks = undefined;
              room.blockAttachments = undefined;
              room.blockedAt = undefined;
              room.blockedBy = undefined;
              
              modified = true;
              unblocked++;
            }
          }
        }

        if (modified) {
          await hostel.save();
        }
      }

      console.log(`✅ Auto-unblock complete: ${unblocked} room(s) unblocked`);
      
      // ✅ Notify all connected clients
      if (io && unblocked > 0) {
        io.emit("room-auto-unblocked", {
          type: "cron-auto-unblock",
          timestamp: now.toISOString(),
          unblocked
        });
        console.log("📡 Broadcast auto-unblock to all clients");
      }

    } catch (error) {
      console.error("❌ Auto-unblock cron error:", error);
    }
  });

  console.log("✅ Auto-unblock cron job started - runs daily at midnight");
};