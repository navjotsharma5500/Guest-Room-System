import cron from "node-cron";
import { autoCancelNoShows, autoCheckoutOverdueGuests } from "../controllers/bookingController.js";
import Hostel from "../models/Hostel.js";

export const startNoShowCronJob = (io) => {
  console.log("🟢 Starting no-show auto-cancel cron job...");
  
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

// ============================================================================
// SOLUTION 1: RUN EVERY 15 MINUTES (RECOMMENDED)
// ============================================================================
// This catches overdue guests within 15 minutes, preventing most conflicts
// Less resource-intensive than every-minute checks
export const startAutoCheckoutCronJob = (io) => {
  console.log("🟢 Starting auto-checkout cron job...");
  
  // Run every 15 minutes to catch overdue guests quickly
  cron.schedule("*/15 * * * *", async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running auto-checkout job...`);
    
    try {
      const result = await autoCheckoutOverdueGuests();
      console.log("✅ Auto-checkout completed:", result);
      
      // ✅ Notify all connected clients
      if (io && result.checkedOut > 0) {
        io.emit("bookingDataUpdated", {
          type: "cron-auto-checkout",
          timestamp: now.toISOString(),
          result
        });
        console.log("📡 Broadcast auto-checkout to all clients");
      }
      
      // ✅ Emit individual checkout events for real-time updates
      if (io && result.checkedOutBookings && result.checkedOutBookings.length > 0) {
        result.checkedOutBookings.forEach((booking) => {
          io.to('dashboard-room').emit('guest-checked-out', {
            bookingId: booking._id,
            hostel: booking.hostel,
            roomNo: booking.roomNo,
            guest: booking.guest,
            paymentResponsibility: booking.paymentResponsibility,
            source: 'cron-auto-checkout',
            timestamp: now.toISOString()
          });
        });
        console.log(`📡 Emitted ${result.checkedOutBookings.length} guest-checked-out events`);
      }
      
      // ✅ If guests moved to defaulters, emit defaulter update
      if (io && result.movedToDefaulters > 0) {
        io.to('dashboard-room').emit('defaulter-stats-updated', {
          type: "auto-checkout-defaulters",
          count: result.movedToDefaulters,
          timestamp: now.toISOString()
        });
        console.log("📡 Broadcast defaulter update to all clients");
      }
      
    } catch (error) {
      console.error("❌ Auto-checkout error:", error);
    }
  });

  console.log("✅ Auto-checkout cron job started - runs every 15 minutes");
};

// ============================================================================
// SOLUTION 2: RUN EVERY 5 MINUTES (MORE AGGRESSIVE)
// ============================================================================
// Use this if you want even faster detection (5-minute window)
// Uncomment and replace Solution 1 if needed
/*
export const startAutoCheckoutCronJob = (io) => {
  console.log("🟢 Starting auto-checkout cron job...");
  
  // Run every 5 minutes
  cron.schedule("*\/5 * * * *", async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running auto-checkout job...`);
    
    try {
      const result = await autoCheckoutOverdueGuests();
      
      if (result.checkedOut > 0) {
        console.log("✅ Auto-checkout completed:", result);
        
        if (io) {
          io.emit("bookingDataUpdated", {
            type: "cron-auto-checkout",
            timestamp: now.toISOString(),
            result
          });
        }
        
        if (io && result.checkedOutBookings && result.checkedOutBookings.length > 0) {
          result.checkedOutBookings.forEach((booking) => {
            io.to('dashboard-room').emit('guest-checked-out', {
              bookingId: booking._id,
              hostel: booking.hostel,
              roomNo: booking.roomNo,
              guest: booking.guest,
              paymentResponsibility: booking.paymentResponsibility,
              source: 'cron-auto-checkout',
              timestamp: now.toISOString()
            });
          });
        }
        
        if (io && result.movedToDefaulters > 0) {
          io.to('dashboard-room').emit('defaulter-stats-updated', {
            type: "auto-checkout-defaulters",
            count: result.movedToDefaulters,
            timestamp: now.toISOString()
          });
        }
      }
      
    } catch (error) {
      console.error("❌ Auto-checkout error:", error);
    }
  });

  console.log("✅ Auto-checkout cron job started - runs every 5 minutes");
};
*/

import VenueBooking from "../models/VenueBooking.js";

// ✅ NEW: Auto-complete expired venue bookings (runs every 15 mins)
export const startVenueAutoCompletionCronJob = (io) => {
  console.log("🟢 Starting venue auto-completion cron job...");

  // Run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running venue auto-completion job...`);

    try {
      // Find bookings that are 'booked' or 'checked_in'
      const activeBookings = await VenueBooking.find({
        status: { $in: ["booked", "checked_in"] },
      });

      let completedCount = 0;
      const completedIds = [];

      for (const booking of activeBookings) {
        // Construct checkout datetime
        const checkoutDate = booking.checkOutDate; // YYYY-MM-DD
        const checkoutTime = booking.checkOutTime || "23:59";
        
        // Combine date and time
        const checkoutDateTime = new Date(`${checkoutDate}T${checkoutTime}`);

        // If checkout time has passed, mark as completed
        if (checkoutDateTime < now) {
          booking.status = "completed";
          await booking.save();
          completedCount++;
          completedIds.push(booking._id);
        }
      }

      if (completedCount > 0) {
        console.log(`✅ Auto-completed ${completedCount} venue bookings`);
        
        if (io) {
          io.emit("venueBookingCompletedBatch", {
            type: "cron-auto-complete",
            count: completedCount,
            bookingIds: completedIds,
            timestamp: now.toISOString(),
          });
          console.log("📡 Broadcast venue completion to all clients");
        }
      }
    } catch (error) {
      console.error("❌ Venue auto-completion error:", error);
    }
  });

  console.log("✅ Venue auto-completion cron job started - runs every 15 minutes");
};

// ✅ NEW: Auto-unblock expired room blocks (runs daily at midnight)
export const startAutoUnblockCronJob = (io) => {
  console.log("🟢 Starting auto-unblock room cron job...");
  
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