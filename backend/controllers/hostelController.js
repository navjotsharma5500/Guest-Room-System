// controllers/hostelController.js
import Booking from "../models/Booking.js";
import Hostel from "../models/Hostel.js";
import { createLog } from "../middleware/logMiddleware.js";
import { emitEvent } from "../utils/socket.js";

const GIRLS_HOSTELS = new Set([
  "Ira Hall (I)",
  "Ananta Hall (N)",
  "Dhriti Hall (PG)",
  "Pavani Hall (PG-2)",
  "Vahni Hall (Q)",
]);

const inferHostelType = (name = "") => (GIRLS_HOSTELS.has(name) ? "girls" : "boys");

const inferGuestCapacity = (hostelName = "", room = {}) => {
  if (Number(room.guestCapacity) > 0) return Number(room.guestCapacity);
  return hostelName === "Ira Hall (I)" ? 3 : 2;
};

const normalizeRoomForResponse = (hostel, room) => ({
  _id: room._id,
  roomNo: room.roomNo,
  roomType: room.roomType || "Guest Room",
  guestRoom: room.guestRoom !== false,
  guestCapacity: inferGuestCapacity(hostel.name, room),
  caretakerEmail: room.caretakerEmail || hostel.caretakerEmail,
  wardenEmail: room.wardenEmail || hostel.wardenEmail,
  isBlocked: room.isBlocked || false,
  blockedTill: room.blockedTill,
  blockRemarks: room.blockRemarks,
  blockAttachments: room.blockAttachments || [],
  blockedAt: room.blockedAt,
  blockedBy: room.blockedBy,
  roomState: room.isBlocked ? "maintenance_blocked" : room.roomState || "available",
  cleaningPendingSince: room.cleaningPendingSince,
  lastCheckoutBookingId: room.lastCheckoutBookingId,
  lastCleanedAt: room.lastCleanedAt,
  lastCleanedBy: room.lastCleanedBy,
});

// ======================================================
// GET ALL HOSTELS WITH BOOKINGS
// ======================================================
export const getAllHostelsWithBookings = async (req, res) => {
  try {
    console.log("🔍 Fetching all hostels with bookings...");

    // ✅ 1) Fetch all hostels
    const hostels = await Hostel.find().lean();
    console.log("✅ Hostels fetched:", hostels.length);

    // ✅ 2) Fetch all bookings
    const bookings = await Booking.find({ status: { $ne: "cancelled" } }).lean();
    console.log("✅ Bookings fetched:", bookings.length);

    // ✅ 3) Build response structure
    const response = hostels.map((hostel) => {
      return {
        _id: hostel._id,
        name: hostel.name,
        code: hostel.code,
        hostelType: hostel.hostelType || inferHostelType(hostel.name),
        caretakerEmail: hostel.caretakerEmail,
        wardenEmail: hostel.wardenEmail,
        active: hostel.active !== false, // Default to true
        rooms: (hostel.rooms || []).map((room) => {
          const roomBookings = bookings.filter(
            (b) => b.hostel === hostel.name && b.roomNo === room.roomNo
          );
          const normalizedRoom = normalizeRoomForResponse(hostel, room);

          return {
            ...normalizedRoom,
            
            bookings: roomBookings.map((b) => ({
              id: b._id,
              _id: b._id,
              bookingId: b.bookingId,
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
              approvalStatus: b.approvalStatus || "auto_approved",
              isRebookingWithin24hrs: b.isRebookingWithin24hrs ?? false,
              continuousStay: b.continuousStay || {
                isContinuous: false,
                startDate: b.actualCheckInDate || b.from || null,
                totalDays: 0,
                parentBookingId: null,
              },
              directExtension: b.directExtension || {
                used: false,
                oldCheckout: null,
                newCheckout: null,
                remarks: "",
                attachments: [],
                paymentType: "",
                amount: 0,
                paymentRemarks: "",
                paymentAttachments: [],
                createdBy: null,
                createdAt: null,
              },
              reviewDeadline: b.reviewDeadline || null,
              status: b.status || "booked",
              paymentType: b.paymentType,
              amount: b.amount,
              checkoutType: b.checkoutType || "NORMAL",
              earlyCheckIn: b.earlyCheckIn || {
                isEarly: false,
                amount: 0,
                paymentType: "Paid",
                remarks: "",
                attachments: [],
              },
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

    console.log("✅ Response built successfully");
    res.json({ success: true, hostels: response });

  } catch (error) {
    console.error("❌ Hostel fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching hostels",
      error: error.message,
    });
  }
};

// ======================================================
// PUBLIC HOSTELS FOR GUEST ROOM ENQUIRY FORM
// ======================================================
export const getPublicHostelOptions = async (req, res) => {
  try {
    const hostels = await Hostel.find({ active: { $ne: false } }).lean();
    const options = hostels.map((hostel) => ({
      _id: hostel._id,
      name: hostel.name,
      code: hostel.code,
      hostelType: hostel.hostelType || inferHostelType(hostel.name),
      rooms: (hostel.rooms || [])
        .map((room) => normalizeRoomForResponse(hostel, room))
        .filter((room) => room.guestRoom !== false),
    }));

    res.json({ success: true, hostels: options });
  } catch (error) {
    console.error("❌ Public hostel options error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching hostel options",
      error: error.message,
    });
  }
};

// ======================================================
// PUBLIC ACTIVE HOSTELS FOR LIGHTWEIGHT DROPDOWNS
// ======================================================
export const getActiveHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find({ active: { $ne: false } })
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    res.json(hostels.map((hostel) => ({
      _id: hostel._id,
      name: hostel.name,
    })));
  } catch (error) {
    console.error("❌ Active hostel list error:", error);
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
    const { name, code, hostelType, caretakerEmail, wardenEmail, rooms, active } = req.body;

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
      hostelType: hostelType || inferHostelType(name),
      caretakerEmail,
      wardenEmail,
      active: active !== false,
      rooms: rooms || [],
    });

    createLog("hostel_created", req.user?._id, { hostelId: newHostel._id });

    res.json({ success: true, hostel: newHostel });

  } catch (error) {
    console.error("❌ Create hostel error:", error);
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
    const { name, code, hostelType, caretakerEmail, wardenEmail, rooms, active } = req.body;

    console.log("🔓 UPDATE HOSTEL REQUEST:");
    console.log("   ID:", id);
    console.log("   Body:", JSON.stringify(req.body, null, 2));

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error("❌ Invalid ObjectId format:", id);
      return res.status(400).json({
        success: false,
        message: "Invalid hostel ID format",
      });
    }

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      console.error("❌ Hostel not found:", id);
      return res.status(404).json({
        success: false,
        message: "Hostel not found",
      });
    }

    console.log("✅ Found hostel:", hostel.name);

    // Check if new name conflicts with existing hostel
    if (name && name !== hostel.name) {
      const existingHostel = await Hostel.findOne({ name });
      if (existingHostel) {
        console.error("❌ Hostel name already exists:", name);
        return res.status(400).json({
          success: false,
          message: "Hostel with this name already exists",
        });
      }
    }

    // Update fields
    if (name !== undefined) hostel.name = name;
    if (code !== undefined) hostel.code = code;
    if (hostelType !== undefined) hostel.hostelType = hostelType;
    if (caretakerEmail !== undefined) hostel.caretakerEmail = caretakerEmail;
    if (wardenEmail !== undefined) hostel.wardenEmail = wardenEmail;
    if (rooms !== undefined) {
      const existingByRoomNo = new Map((hostel.rooms || []).map((room) => [room.roomNo, room]));
      hostel.rooms = rooms.map((incomingRoom) => {
        const existingRoom = existingByRoomNo.get(incomingRoom.roomNo);
        return {
          ...incomingRoom,
          isBlocked: incomingRoom.isBlocked ?? existingRoom?.isBlocked ?? false,
          blockedTill: incomingRoom.blockedTill ?? existingRoom?.blockedTill,
          blockRemarks: incomingRoom.blockRemarks ?? existingRoom?.blockRemarks,
          blockAttachments: incomingRoom.blockAttachments ?? existingRoom?.blockAttachments ?? [],
          blockedAt: incomingRoom.blockedAt ?? existingRoom?.blockedAt,
          blockedBy: incomingRoom.blockedBy ?? existingRoom?.blockedBy,
          roomState: incomingRoom.roomState ?? existingRoom?.roomState ?? "available",
          guestRoom: incomingRoom.guestRoom ?? existingRoom?.guestRoom ?? true,
          guestCapacity: Number(incomingRoom.guestCapacity || existingRoom?.guestCapacity || inferGuestCapacity(hostel.name, incomingRoom)),
          cleaningPendingSince: incomingRoom.cleaningPendingSince ?? existingRoom?.cleaningPendingSince,
          lastCheckoutBookingId: incomingRoom.lastCheckoutBookingId ?? existingRoom?.lastCheckoutBookingId,
          lastCleanedAt: incomingRoom.lastCleanedAt ?? existingRoom?.lastCleanedAt,
          lastCleanedBy: incomingRoom.lastCleanedBy ?? existingRoom?.lastCleanedBy,
        };
      });
    }
    if (active !== undefined) hostel.active = active;

    await hostel.save();

    console.log("✅ Hostel updated successfully:", hostel.name);

    createLog("hostel_updated", req.user?._id, { hostelId: hostel._id });

    res.json({ success: true, hostel });

  } catch (error) {
    console.error("❌ Update hostel error:", error);
    console.error("❌ Stack:", error.stack);
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
    console.error("❌ Delete hostel error:", error);
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
    console.error("❌ Get hostel error:", error);
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
    else if (role === "caretaker" || role === "warden") {
      if (assignedHostel !== hostelName) {
        return res.status(403).json({
          message: "You can block rooms only in your assigned hostel",
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
    // Do not force end-of-day here, respect the provided time
    // blockEndDate.setHours(23, 59, 59, 999); 

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
    else if (role === "caretaker" || role === "warden") {
      if (assignedHostel !== hostelName) {
        return res.status(403).json({
          message: "You can unblock rooms only in your assigned hostel",
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
