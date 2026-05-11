import cron from "node-cron";
import { asyncSendEmails } from "./asyncEmail.js";
import { autoCancelNoShows, autoCheckoutOverdueGuests } from "../controllers/bookingController.js";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import { sendScheduledAnalyticsReport } from "./analyticsEmailReports.js";

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

// ✅ NEW: Auto-cancel expired or clashing extension requests (runs every hour)
export const startExtensionAutoCancelCronJob = (io) => {
  console.log("🟢 Starting extension request auto-reject cron job...");

  cron.schedule("0 * * * *", async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running extension request auto-reject job...`);

    try {
      const ExtensionRequest = (await import("../models/ExtensionRequest.js")).default;
      const Booking = (await import("../models/Booking.js")).default;
      const { sendEmailAdvanced } = await import("../emails/sendEmail.js");
      const extensionRejectedTemplate = (await import("../emails/templates/extensionRejected.js")).default;

      // ✅ Date-only comparison (consistent with extension creation logic)
      const toDateOnly = (d) => {
        const dt = new Date(d);
        return Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
      };
      const todayDateOnly = toDateOnly(now);

      // Find all pending requests
      const pendingRequests = await ExtensionRequest.find({ status: "pending" }).populate("bookingId");
      
      let rejectedCount = 0;

      for (const req of pendingRequests) {
        if (!req.bookingId) continue; // Skip if booking deleted

        let shouldReject = false;
        let reason = "";

        // ✅ FIXED: Check if guest has already checked out (current date >= booking's checkout date)
        // Once the guest checks out, extending is meaningless. We must auto-reject to prevent
        // approving extensions AFTER the guest has already left the room.
        const bookingCheckoutDateOnly = toDateOnly(req.bookingId.to);
        if (todayDateOnly >= bookingCheckoutDateOnly) {
            shouldReject = true;
            reason = "Extension request expired (guest checkout date has passed)";
            console.log(`📅 Request ${req._id}: Guest checkout date (${bookingCheckoutDateOnly}) passed`);
        }

        // Condition 2: Another booking created that clashes with requestedCheckout
        if (!shouldReject) {
            const clash = await Booking.findOne({
                hostel: req.hostel,
                roomNo: req.bookingId.roomNo,
                status: { $in: ["booked", "checked_in"] },
                _id: { $ne: req.bookingId._id }, // Exclude current booking
                $or: [
                    {
                        from: { $lt: req.requestedCheckout },
                        to: { $gt: req.oldCheckout }
                    }
                ]
            });
            
            if (clash) {
                shouldReject = true;
                reason = "Room has been booked by another guest for the requested dates.";
            }
        }

        if (shouldReject) {
            console.log(`🚫 Auto-rejecting extension request ${req._id}: ${reason}`);
            
            // ✅ Set to "rejected" status — requests NEVER disappear, only change status
            req.status = "rejected";
            req.rejectionReason = reason;
            await req.save();
            
            // Send Email to Guest
            const emailHtml = extensionRejectedTemplate({
                guestName: req.bookingId.guest,
                hostel: req.hostel,
                roomNo: req.bookingId.roomNo,
                oldCheckout: req.oldCheckout,
                requestedCheckout: req.requestedCheckout,
                reason: reason
            });
            
            try {
                // ✅ Send to guest
                asyncSendEmails(() => sendEmailAdvanced({
                    to: req.bookingId.email,
                    subject: "Extension Request Rejected (Auto)",
                    html: emailHtml
                }));
                
                // ✅ Send to hostel warden and caretaker
                const warden = await User.findOne({ role: "warden", hostel: req.hostel });
                const caretaker = await User.findOne({ role: "caretaker", assignedHostel: req.hostel });
                
                const staffEmails = [];
                if (warden && warden.email) staffEmails.push(warden.email);
                if (caretaker && caretaker.email) staffEmails.push(caretaker.email);
                
                if (staffEmails.length > 0) {
                    const staffNotificationHtml = `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2 style="color: #e74c3c;">Extension Request Auto-Rejected</h2>
                            <p>An extension request has been <strong>automatically rejected</strong> for:</p>
                            <ul>
                                <li><strong>Guest:</strong> ${req.bookingId.guest}</li>
                                <li><strong>Room:</strong> ${req.bookingId.roomNo}</li>
                                <li><strong>Original Checkout:</strong> ${new Date(req.oldCheckout).toLocaleDateString('en-IN')}</li>
                                <li><strong>Requested Checkout:</strong> ${new Date(req.requestedCheckout).toLocaleDateString('en-IN')}</li>
                                <li><strong>Rejection Reason:</strong> ${reason}</li>
                            </ul>
                            <p style="margin-top: 20px; color: #666;">The guest has been notified accordingly.</p>
                        </div>
                    `;
                    
                    try {
                        asyncSendEmails(() => sendEmailAdvanced({
                            to: staffEmails,
                            subject: `[FYI] Extension Auto-Rejected - ${req.hostel} Room ${req.bookingId.roomNo}`,
                            html: staffNotificationHtml
                        }));
                    } catch (staffEmailError) {
                        console.warn("Failed to queue auto-rejection notification to hostel staff:", staffEmailError);
                    }
                }
            } catch (err) {
                console.error("Failed to queue rejection email:", err);
            }
            
            rejectedCount++;
        }
      }

      if (rejectedCount > 0) {
        console.log(`✅ Auto-rejected ${rejectedCount} extension requests (guest checkout date passed or room clash).`);
        if (io) {
            io.emit("extension-requests-updated", { count: rejectedCount, action: "rejected" });
        }
      }

    } catch (error) {
      console.error("❌ Extension auto-reject error:", error);
    }
  });
};

// ✅ NEW: Send reminder email for pending extension requests (1 hour before checkout)
export const startExtensionReminderCronJob = (io) => {
  console.log("🟢 Starting extension request reminder cron job...");

  // Run every 15 minutes to catch requests within the 1-hour window
  cron.schedule("*/15 * * * *", async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running extension request reminder job...`);

    try {
      const ExtensionRequest = (await import("../models/ExtensionRequest.js")).default;
      const User = (await import("../models/User.js")).default;
      const { sendEmailAdvanced } = await import("../emails/sendEmail.js");
      const extensionReminderTemplate = (await import("../emails/templates/extensionReminder.js")).default;
      const { formatDateIST } = await import("../emails/utils/dateFormatter.js");

      // Find all pending requests
      const pendingRequests = await ExtensionRequest.find({ 
        status: "pending",
        reminderSentAt: { $exists: false } // Only send reminder once
      }).populate("bookingId");

      let remindersSent = 0;

      for (const req of pendingRequests) {
        if (!req.bookingId) continue; // Skip if booking deleted

        const checkoutTime = new Date(req.bookingId.to);
        const timeUntilCheckout = Math.round((checkoutTime - now) / (1000 * 60)); // minutes

        // Send reminder if checkout is within 45-120 minutes (roughly 1 hour window)
        if (timeUntilCheckout > 0 && timeUntilCheckout <= 120) {
          console.log(`📧 Sending reminder for extension request ${req._id}: ${timeUntilCheckout} minutes until checkout`);

          try {
            // Determine approver emails and role name based on required approval level
            let approverEmails = [];
            let roleName = "";
            let approvalLevel = "";

            const days = Math.round(
              (new Date(req.requestedCheckout) - new Date(req.oldCheckout)) / (1000 * 60 * 60 * 24)
            );

            if (req.requiredApprovalLevel === "co_warden") {
              approverEmails = ["cowarden@thapar.edu", "cowarden2@thapar.edu"];
              roleName = "Co-Warden";
              approvalLevel = `Co-Warden Level (${days} day${days > 1 ? 's' : ''} extension)`;
            } else if (req.requiredApprovalLevel === "adosa") {
              approverEmails = ["adosa2@thapar.edu"];
              roleName = "Dean of Student Affairs (ADOSA)";
              approvalLevel = `ADOSA Level (${days} day${days > 1 ? 's' : ''} extension)`;
            } else if (req.requiredApprovalLevel === "admin") {
              approverEmails = ["dosa@thapar.edu"];
              roleName = "Dean of Student Affairs (DoSA)";
              approvalLevel = `DoSA Level (${days} day${days > 1 ? 's' : ''} extension)`;
            }

            const emailHtml = extensionReminderTemplate({
              roleName,
              guestName: req.bookingId.guest,
              contact: req.bookingId.contact || "—",
              hostel: req.hostel,
              roomNo: req.bookingId.roomNo,
              currentCheckout: req.oldCheckout,
              requestedCheckout: req.requestedCheckout,
              paymentType: req.extensionPaymentType || "Paid",
              amount: req.extensionAmount || 0,
              requestId: req._id.toString().slice(-8).toUpperCase(),
              approvalLevel,
              submittedAt: formatDateIST(req.createdAt),
              timeUntilCheckout // in minutes
            });

            // Send to approver(s)
            if (approverEmails.length > 0) {
              asyncSendEmails(() => sendEmailAdvanced({
                to: approverEmails,
                subject: `⏰ URGENT: Extension Request Pending – Checkout in ${Math.round(timeUntilCheckout / 60)} Hour${Math.round(timeUntilCheckout / 60) > 1 ? 's' : ''}`,
                html: emailHtml
              }));

              // Mark reminder as sent
              req.reminderSentAt = now;
              await req.save();
              remindersSent++;
            }
          } catch (err) {
            console.error(`Failed to send reminder for request ${req._id}:`, err);
          }
        }
        
        // Auto-reject if checkout time has passed
        if (timeUntilCheckout <= 0) {
          console.log(`🚫 Auto-rejecting extension request ${req._id}: Checkout time passed`);
          req.status = "rejected";
          req.rejectionReason = "Extension request expired (checkout time has passed)";
          await req.save();
        }
      }

      if (remindersSent > 0) {
        console.log(`✅ Sent ${remindersSent} extension request reminder email(s).`);
        if (io) {
          io.emit("extension-requests-updated", { count: remindersSent, action: "reminder_sent" });
        }
      }

    } catch (error) {
      console.error("❌ Extension reminder error:", error);
    }
  });

  console.log("✅ Extension reminder cron job started - runs every 15 minutes");
};

// ============================================================================
// AUTO-REJECT EXPIRED REBOOKING APPROVALS (Runs every 10 minutes)
// ============================================================================
export const startRebookingAutoRejectCronJob = (io) => {
  console.log("🟢 Starting rebooking auto-reject cron job...");

  // Run every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running rebooking auto-reject job...`);

    try {
      const Booking = (await import("../models/Booking.js")).default;

      // Find bookings that are under review and have exceeded review deadline
      const expiredBookings = await Booking.find({
        approvalStatus: "under_review",
        reviewDeadline: { $exists: true, $ne: null, $lt: now }
      });

      if (expiredBookings.length === 0) {
        console.log("✅ No expired rebooking approvals found");
        return;
      }

      console.log(`⏳ Found ${expiredBookings.length} expired rebooking approval(s)`);

      let rejectedCount = 0;
      for (const booking of expiredBookings) {
        try {
          console.log(`🚫 Auto-rejecting expired rebooking: ${booking._id}`);
          
          booking.approvalStatus = "rejected";
          booking.status = "cancelled";
          booking.cancelDate = new Date();
          booking.cancelRemarks = "Rebooking approval expired - deadline exceeded";
          
          await booking.save();
          rejectedCount++;

          console.log(`✅ Auto-rejected booking ${booking._id}`);
        } catch (err) {
          console.error(`❌ Failed to auto-reject booking ${booking._id}:`, err.message);
        }
      }

      if (rejectedCount > 0) {
        console.log(`✅ Auto-rejected ${rejectedCount} expired rebooking approval(s)`);
        
        if (io) {
          io.emit("rebooking-auto-rejected", {
            type: "cron-auto-reject",
            count: rejectedCount,
            timestamp: now.toISOString()
          });
          console.log("📡 Broadcast rebooking auto-reject to all clients");
        }
      }

    } catch (error) {
      console.error("❌ Rebooking auto-reject cron error:", error);
    }
  });

  console.log("✅ Rebooking auto-reject cron job started - runs every 10 minutes");
};

// ============================================================================
// SCHEDULED ANALYTICS EMAILS TO ADMIN ROLE
// ============================================================================
export const startAnalyticsEmailCronJobs = () => {
  console.log("🟢 Starting scheduled analytics email cron jobs...");

  const timezone = "Asia/Kolkata";

  const registerReportJob = (label, schedule, periodKey) => {
    cron.schedule(
      schedule,
      async () => {
        const now = new Date();
        console.log(`⏰ [${now.toISOString()}] Running ${label.toLowerCase()} analytics email job...`);

        try {
          const result = await sendScheduledAnalyticsReport(periodKey);
          console.log(`✅ ${label} analytics email job completed:`, result);
        } catch (error) {
          console.error(`❌ ${label} analytics email job failed:`, error);
        }
      },
      { timezone }
    );
  };

  registerReportJob("Weekly", "0 8 * * 1", "weekly");
  registerReportJob("Monthly", "0 8 1 * *", "monthly");
  registerReportJob("Quarterly", "0 8 1 1,4,7,10 *", "quarterly");
  registerReportJob("Annual", "0 8 1 1 *", "annual");

  console.log("✅ Scheduled analytics email cron jobs started");
  console.log("   • Weekly: Monday 08:00 IST");
  console.log("   • Monthly: 1st day 08:00 IST");
  console.log("   • Quarterly: Jan/Apr/Jul/Oct 1st 08:00 IST");
  console.log("   • Annual: Jan 1st 08:00 IST");
};
