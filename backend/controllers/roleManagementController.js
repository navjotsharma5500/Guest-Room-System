import User from '../models/User.js';
import NightStudent from '../models/NightStudent.js';
import SocietyNameSuggestion from '../models/SocietyNameSuggestion.js';
import EventNameSuggestion from '../models/EventNameSuggestion.js';
import { createLog } from '../middleware/logMiddleware.js';

// ── GET /api/night/roles ─────────────────────────────────────────────────────
export const getRoles = async (req, res) => {
  try {
    const { search, role, society } = req.query;
    const query = { role: { $in: ['president', 'gen_sec'] } };

    if (role) {
      query.role = role.toLowerCase();
    }

    if (society) {
      query.societies = society;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
      ];
    }

    const roles = await User.find(query).select('name email role rollNo societies').sort({ name: 1 });
    res.status(200).json({ success: true, roles });
  } catch (err) {
    console.error('❌ getRoles error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/night/roles ────────────────────────────────────────────────────
export const addRole = async (req, res) => {
  try {
    const { rollNo, role, societies } = req.body;

    if (!rollNo || !role || !societies || !Array.isArray(societies) || societies.length === 0) {
      return res.status(400).json({ success: false, message: 'rollNo, role (president/gen_sec), and at least one society required' });
    }

    const student = await NightStudent.findOne({ rollNo: rollNo.toUpperCase(), isActive: true });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Active student not found in master list' });
    }

    let user = await User.findOne({ email: student.email });

    if (user) {
      // Update existing user
      // Staff roles cannot be downgraded here
      const STAFF_ROLES = ["admin", "adosa", "manager", "warden", "caretaker", "assistant", "dd_assistant", "guard"];
      if (STAFF_ROLES.includes(user.role?.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Cannot assign student roles to staff accounts' });
      }

      user.role = role.toLowerCase();
      user.societies = [...new Set(societies)]; // ensure unique
      user.rollNo = student.rollNo;
      await user.save();
    } else {
      // Create new student user (needs a random password as it's meant for Google login mostly, 
      // or they can reset it. For now, we follow existing createUser logic or just use student master)
      // Actually, if they don't exist in User.js, we should create them so they can log in.
      const randomPassword = Math.random().toString(36).slice(-10);
      user = await User.create({
        name: student.name,
        email: student.email,
        password: randomPassword, // In a real app, send email or use Google Auth
        role: role.toLowerCase(),
        rollNo: student.rollNo,
        societies: [...new Set(societies)],
      });
    }

    createLog('role_assigned', req.user?._id, { targetUser: user._id, role, societies });

    res.status(201).json({ success: true, message: 'Role assigned successfully', user });
  } catch (err) {
    console.error('❌ addRole error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/night/roles/:userId ──────────────────────────────────────────
export const deleteRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // "Remove role/society mapping. If no roles left: User becomes normal student"
    // ✅ FALLBACK TO STUDENT
    user.role = 'student';
    user.societies = [];
    await user.save();

    createLog('role_revoked', req.user?._id, { targetUser: userId });

    res.status(200).json({ success: true, message: 'Role revoked, user reverted to student' });
  } catch (err) {
    console.error('❌ deleteRole error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/night/events ────────────────────────────────────────────────────
export const getEvents = async (req, res) => {
  try {
    const suggestions = await EventNameSuggestion.find().sort({ name: 1 });
    res.status(200).json({ success: true, events: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/night/societies ─────────────────────────────────────────────────
export const getSocieties = async (req, res) => {
  try {
    const suggestions = await SocietyNameSuggestion.find().sort({ name: 1 });
    res.status(200).json({ success: true, societies: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
