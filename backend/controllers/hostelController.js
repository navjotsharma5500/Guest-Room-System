// controllers/hostelController.js
import Booking from "../models/Booking.js";
import Hostel from "../models/Hostel.js";
import { createLog } from "../middleware/logMiddleware.js";
import { emitEvent } from "../utils/socket.js";

// ======================================================
// GET ALL HOSTELS WITH BOOKINGS
// ======================================================
export const getAllHostelsWithBookings = async (req, res) => {
  try {
    console.log("ðŸ” Fetching all hostels with bookings...");

    // âœ… 1) Fetch all hostels
    const hostels = await Hostel.find().lean();
    console.log("âœ… Hostels fetched:", hostels.length);

    // âœ… 2) Fetch all bookings
    const bookings = await Booking.find({ status: { $ne: "cancelled" } }).lean();
    console.log("âœ… Bookings fetched:", bookings.length);

    // âœ… 3) Build response structure
    const response = hostels.map((hostel) => {
      return {
        _id: hostel._id,
        name: hostel.name,
        code: hostel.code,
        caretakerEmail: hostel.caretakerEmail,
        wardenEmail: hostel.wardenEmail,
        active: hostel.active !== false, // Default to true
        rooms: (hostel.rooms || []).map((room) => {
          const roomBookings = bookings.filter(
            (b) => b.hostel === hostel.name && b.roomNo === room.roomNo
          );

          return {
            roomNo: room.roomNo,
            roomType: room.roomType || "Guest Room",
            caretakerEmail: room.caretakerEmail || hostel.caretakerEmail,
            wardenEmail: room.wardenEmail || hostel.wardenEmail,
            bookings: roomBookings.map((b) => ({
              id: b._id,
              _id: b._id,
              guest: b.guest || b.guestName || "Guest",
              contact: b.contact,
              email: b.email,
              from: b.from,
              to: b.to,
              checkInTime: b.checkInTime || "00:00",
              checkOutTime: b.checkOutTime || "23:59",
              numGuests: b.numGuests,
              males: b.males,
              females: b.females,
              purpose: b.purpose,
              city: b.city,
              state: b.state,
              status: b.status || "booked",
              paymentType: b.paymentType,
              amount: b.amount,
              remarks: b.remarks || "",
              cancelRemarks: b.cancelRemarks || "",
              files: b.files || [],
              rollno: b.rollno,
              department: b.department,
              reference: b.reference,
            })),
          };
        }),
      };
    });

    console.log("âœ… Response built successfully");
    res.json({ success: true, hostels: response });

  } catch (error) {
    console.error("âŒ Hostel fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching hostels",
      error: error.message,
    });
  }
};

// ======================================================
// CREATE HOSTEL
// ======================================================
export const createHostel = async (req, res) => {
  try {
    const { name, code, caretakerEmail, wardenEmail, rooms, active } = req.body;

    // Check if hostel already exists
    const existingHostel = await Hostel.findOne({ name });
    if (existingHostel) {
      return res.status(400).json({
        success: false,
        message: "Hostel with this name already exists",
      });
    }

    const newHostel = await Hostel.create({
      name,
      code: code || name.substring(0, 3).toUpperCase(),
      caretakerEmail,
      wardenEmail,
      active: active !== false,
      rooms: rooms || [],
    });

    createLog("hostel_created", req.user?._id, { hostelId: newHostel._id });

    res.json({ success: true, hostel: newHostel });

  } catch (error) {
    console.error("âŒ Create hostel error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating hostel",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE HOSTEL
// ======================================================
export const updateHostel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, caretakerEmail, wardenEmail, rooms, active } = req.body;

    console.log("ðŸ”„ UPDATE HOSTEL REQUEST:");
    console.log("   ID:", id);
    console.log("   Body:", JSON.stringify(req.body, null, 2));

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error("âŒ Invalid ObjectId format:", id);
      return res.status(400).json({
        success: false,
        message: "Invalid hostel ID format",
      });
    }

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      console.error("âŒ Hostel not found:", id);
      return res.status(404).json({
        success: false,
        message: "Hostel not found",
      });
    }

    console.log("âœ… Found hostel:", hostel.name);

    // Check if new name conflicts with existing hostel
    if (name && name !== hostel.name) {
      const existingHostel = await Hostel.findOne({ name });
      if (existingHostel) {
        console.error("âŒ Hostel name already exists:", name);
        return res.status(400).json({
          success: false,
          message: "Hostel with this name already exists",
        });
      }
    }

    // Update fields
    if (name !== undefined) hostel.name = name;
    if (code !== undefined) hostel.code = code;
    if (caretakerEmail !== undefined) hostel.caretakerEmail = caretakerEmail;
    if (wardenEmail !== undefined) hostel.wardenEmail = wardenEmail;
    if (rooms !== undefined) hostel.rooms = rooms;
    if (active !== undefined) hostel.active = active;

    await hostel.save();

    console.log("âœ… Hostel updated successfully:", hostel.name);

    createLog("hostel_updated", req.user?._id, { hostelId: hostel._id });

    res.json({ success: true, hostel });

  } catch (error) {
    console.error("âŒ Update hostel error:", error);
    console.error("âŒ Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error updating hostel",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE HOSTEL
// ======================================================
export const deleteHostel = async (req, res) => {
  try {
    const { id } = req.params;

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found",
      });
    }

    // Check if there are active bookings
    const activeBookings = await Booking.countDocuments({
      hostel: hostel.name,
      status: { $ne: "cancelled" },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete hostel with ${activeBookings} active booking(s)`,
      });
    }

    await Hostel.findByIdAndDelete(id);

    createLog("hostel_deleted", req.user?._id, { hostelId: id });

    res.json({ success: true, message: "Hostel deleted successfully" });

  } catch (error) {
    console.error("âŒ Delete hostel error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting hostel",
      error: error.message,
    });
  }
};

// ======================================================
// GET SINGLE HOSTEL
// ======================================================
export const getHostel = async (req, res) => {
  try {
    const { id } = req.params;

    const hostel = await Hostel.findById(id).lean();

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found",
      });
    }

    // Fetch bookings for this hostel
    const bookings = await Booking.find({
      hostel: hostel.name,
      status: { $ne: "cancelled" },
    }).lean();

    const response = {
      ...hostel,
      rooms: (hostel.rooms || []).map((room) => {
        const roomBookings = bookings.filter((b) => b.roomNo === room.roomNo);
        return {
          ...room,
          bookings: roomBookings,
        };
      }),
    };

    res.json({ success: true, hostel: response });

  } catch (error) {
    console.error("âŒ Get hostel error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching hostel",
      error: error.message,
    });
  }
};

// ======================================================
// BLOCK ROOM
// ======================================================
export const blockRoom = async (req, res) => {
  try {
    // ==================================================
    // 🔒 ROLE & HOSTEL AUTHORIZATION
    // ==================================================
    const { role, assignedHostel } = req.user;
    const { hostelName, roomNo } = req.params;

    // Admin / Manager → allowed everywhere
    if (role === "admin" || role === "manager") {
      // allowed
    }
    // Caretaker → only own hostel
    else if (role === "caretaker") {
      if (assignedHostel !== hostelName) {
        return res.status(403).json({
          message: "Caretaker can block rooms only in their assigned hostel",
        });
      }
    }
    // Everyone else → forbidden
    else {
      return res.status(403).json({
        message: "You are not authorized to block or unblock rooms",
      });
    }

    const { blockedTill, blockRemarks, blockAttachments } = req.body;

    console.log("🔒 BLOCK ROOM REQUEST:", {
      hostelName,
      roomNo,
      blockedTill,
      blockRemarks,
      attachments: blockAttachments?.length || 0
    });

    // Validation
    if (!blockedTill) {
      return res.status(400).json({
        success: false,
        message: "Blocked till date is required"
      });
    }

    if (!blockRemarks || !blockRemarks.trim()) {
      return res.status(400).json({
        success: false,
        message: "Remarks are required"
      });
    }

    if (!blockAttachments || blockAttachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one attachment is required"
      });
    }

    // Find hostel
    const hostel = await Hostel.findOne({ name: hostelName });
    
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found"
      });
    }

    // Find room
    const room = hostel.rooms.find(r => r.roomNo === roomNo);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check if room already blocked
    if (room.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Room is already blocked"
      });
    }

    // ✅ CRITICAL: Check for ongoing or upcoming bookings
    const blockStartDate = new Date();
    blockStartDate.setHours(0, 0, 0, 0);
    
    const blockEndDate = new Date(blockedTill);
    blockEndDate.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      hostel: hostelName,
      roomNo: roomNo,
      status: { $nin: ["cancelled", "checked_out", "no_show"] }
    });

    const conflictingBookings = bookings.filter(b => {
      const bookingStart = new Date(b.from);
      bookingStart.setHours(0, 0, 0, 0);
      
      const bookingEnd = new Date(b.to);
      bookingEnd.setHours(23, 59, 59, 999);

      // Check if blocking period overlaps with booking
      return !(blockEndDate < bookingStart || blockStartDate > bookingEnd);
    });

    if (conflictingBookings.length > 0) {
      const conflicts = conflictingBookings.map(b => ({
        guest: b.guest,
        from: b.from,
        to: b.to
      }));

      return res.status(400).json({
        success: false,
        message: `Cannot block room - ${conflictingBookings.length} conflicting booking(s) found`,
        conflicts
      });
    }

    // Block the room
    room.isBlocked = true;
    room.blockedTill = new Date(blockedTill);
    room.blockRemarks = blockRemarks;
    room.blockAttachments = blockAttachments;
    room.blockedAt = new Date();
    room.blockedBy = req.user?._id || null;

    await hostel.save();

    console.log("✅ Room blocked successfully:", {
      hostel: hostelName,
      room: roomNo,
      blockedTill: room.blockedTill
    });

    // ✅ Emit Socket.IO event
    try {
      emitEvent('room-blocked', {
        hostel: hostelName,
        roomNo: roomNo,
        blockedTill: room.blockedTill,
        timestamp: Date.now()
      });
      console.log('📡 Emitted room-blocked event');
    } catch (err) {
      console.warn('Socket emit failed:', err.message);
    }

    res.json({
      success: true,
      message: "Room blocked successfully",
      room: {
        roomNo: room.roomNo,
        isBlocked: room.isBlocked,
        blockedTill: room.blockedTill,
        blockRemarks: room.blockRemarks,
        blockAttachments: room.blockAttachments
      }
    });

  } catch (error) {
    console.error("❌ Block room error:", error);
    res.status(500).json({
      success: false,
      message: "Error blocking room",
      error: error.message
    });
  }
};

// ======================================================
// UNBLOCK ROOM
// ======================================================
export const unblockRoom = async (req, res) => {
  try {
    // ==================================================
    // 🔒 ROLE & HOSTEL AUTHORIZATION
    // ==================================================
    const { role, assignedHostel } = req.user;
    const { hostelName, roomNo } = req.params;

    // Admin / Manager → allowed everywhere
    if (role === "admin" || role === "manager") {
      // allowed
    }
    // Caretaker → only own hostel
    else if (role === "caretaker") {
      if (assignedHostel !== hostelName) {
        return res.status(403).json({
          message: "Caretaker can block rooms only in their assigned hostel",
        });
      }
    }
    // Everyone else → forbidden
    else {
      return res.status(403).json({
        message: "You are not authorized to block or unblock rooms",
      });
    }

    console.log("🔓 UNBLOCK ROOM REQUEST:", {
      hostelName,
      roomNo
    });

    // Find hostel
    const hostel = await Hostel.findOne({ name: hostelName });
    
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found"
      });
    }

    // Find room
    const room = hostel.rooms.find(r => r.roomNo === roomNo);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check if room is blocked
    if (!room.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Room is not blocked"
      });
    }

    // Unblock the room
    room.isBlocked = false;
    room.blockedTill = undefined;
    room.blockRemarks = undefined;
    room.blockAttachments = undefined;
    room.blockedAt = undefined;
    room.blockedBy = undefined;

    await hostel.save();

    console.log("✅ Room unblocked successfully:", {
      hostel: hostelName,
      room: roomNo
    });

    // ✅ Emit Socket.IO event
    try {
      emitEvent('room-unblocked', {
        hostel: hostelName,
        roomNo: roomNo,
        timestamp: Date.now()
      });
      console.log('📡 Emitted room-unblocked event');
    } catch (err) {
      console.warn('Socket emit failed:', err.message);
    }

    res.json({
      success: true,
      message: "Room unblocked successfully",
      room: {
        roomNo: room.roomNo,
        isBlocked: room.isBlocked
      }
    });

  } catch (error) {
    console.error("❌ Unblock room error:", error);
    res.status(500).json({
      success: false,
      message: "Error unblocking room",
      error: error.message
    });
  }
};