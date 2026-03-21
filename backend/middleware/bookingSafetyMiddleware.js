// 📁 CREATE NEW FILE: backend/middleware/bookingSafetyMiddleware.js

import Booking from "../models/Booking.js";
import Enquiry from "../models/Enquiry.js";

/**
 * ✅ SAFETY NET: Verify booking was actually created before marking enquiry as booked
 * This middleware runs BEFORE marking enquiry as "booked"
 */
export const verifyBookingExists = async (req, res, next) => {
  try {
    const { id } = req.params; // enquiry ID
    
    console.log("🔍 Verifying booking exists for enquiry:", id);
    
    // Check if ANY booking exists with this enquiryId
    const bookingCount = await Booking.countDocuments({ enquiryId: id });
    
    if (bookingCount === 0) {
      console.error("❌ SAFETY CHECK FAILED: No booking found for enquiry", id);
      return res.status(400).json({
        success: false,
        message: "Cannot mark enquiry as booked - no booking record exists",
        code: "BOOKING_NOT_FOUND",
        enquiryId: id
      });
    }
    
    console.log(`✅ SAFETY CHECK PASSED: ${bookingCount} booking(s) found for enquiry`, id);
    next();
    
  } catch (err) {
    console.error("❌ Safety check error:", err);
    return res.status(500).json({
      success: false,
      message: "Safety verification failed",
      error: err.message
    });
  }
};

/**
 * ✅ CLEANUP: Revert enquiry status if booking creation fails
 */
export const revertEnquiryOnBookingFail = async (enquiryId) => {
  try {
    console.log("🔄 Checking if enquiry needs revert:", enquiryId);
    
    const enquiry = await Enquiry.findById(enquiryId);
    
    if (!enquiry) {
      console.warn("⚠️ Enquiry not found:", enquiryId);
      return false;
    }
    
    if (enquiry.status === "booked") {
      // Check if booking actually exists
      const bookingExists = await Booking.exists({ enquiryId });
      
      if (!bookingExists) {
        console.log("🔄 REVERTING enquiry status - no booking found");
        enquiry.status = "approved";
        await enquiry.save();
        
        console.log("✅ Enquiry reverted to approved:", enquiryId);
        return true;
      } else {
        console.log("✅ Booking exists, no revert needed");
      }
    } else {
      console.log(`ℹ️ Enquiry status is "${enquiry.status}", no revert needed`);
    }
    
    return false;
    
  } catch (err) {
    console.error("❌ Revert error:", err);
    return false;
  }
};

/**
 * ✅ PERIODIC CLEANUP: Run every hour to fix orphaned enquiries
 */
export const cleanupOrphanedEnquiries = async () => {
  try {
    console.log("================================================================================");
    console.log("🧹 Starting orphaned enquiry cleanup...");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("================================================================================");
    
    // Find all enquiries marked as "booked"
    const bookedEnquiries = await Enquiry.find({ status: "booked" });
    
    console.log(`📊 Found ${bookedEnquiries.length} enquiries with 'booked' status`);
    
    let fixed = 0;
    let orphaned = [];
    
    for (const enquiry of bookedEnquiries) {
      // Check if booking actually exists
      const booking = await Booking.findOne({ enquiryId: enquiry._id });
      
      if (!booking) {
        console.log(`⚠️ ORPHANED ENQUIRY DETECTED:`);
        console.log(`   - ID: ${enquiry._id}`);
        console.log(`   - Name: ${enquiry.name}`);
        console.log(`   - Email: ${enquiry.email}`);
        console.log(`   - Created: ${enquiry.createdAt}`);
        
        orphaned.push({
          id: enquiry._id,
          name: enquiry.name,
          email: enquiry.email,
          createdAt: enquiry.createdAt
        });
        
        // Revert to approved status
        enquiry.status = "approved";
        await enquiry.save();
        
        fixed++;
        
        console.log(`✅ Reverted enquiry ${enquiry._id} to approved status`);
      }
    }
    
    console.log("================================================================================");
    console.log(`🧹 Cleanup complete. Fixed ${fixed} orphaned enquiries.`);
    if (orphaned.length > 0) {
      console.log("📋 Orphaned enquiries:");
      orphaned.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.name} (${e.email}) - ${e.id}`);
      });
    } else {
      console.log("✅ No orphaned enquiries found - system is healthy!");
    }
    console.log("================================================================================");
    
    return { 
      success: true, 
      fixed,
      total: bookedEnquiries.length,
      orphaned,
      timestamp: new Date().toISOString()
    };
    
  } catch (err) {
    console.error("================================================================================");
    console.error("❌ Cleanup error:", err);
    console.error("================================================================================");
    return { 
      success: false, 
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
};

export default {
  verifyBookingExists,
  revertEnquiryOnBookingFail,
  cleanupOrphanedEnquiries
};