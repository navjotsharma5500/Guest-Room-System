// controllers/hostelController.js
import Booking from "../models/Booking.js";
import Hostel from "../models/Hostel.js";
import { createLog } from "../middleware/logMiddleware.js";

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