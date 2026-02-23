// backend/controllers/permissionListController.js
import { getSocketIO } from '../utils/socket.js';
import NightPermissionList from '../models/NightPermissionList.js';
import NightStudent from '../models/NightStudent.js';
import PermissionSession from '../models/PermissionSession.js';
import VenueBooking from '../models/VenueBooking.js';
import { getSettings } from '../models/NightSystemSettings.js';

// ── helpers ──────────────────────────────────────────────────────────────────

const emitSafe = (event, payload, room = null) => {
  try {
    const io = getSocketIO();
    if (room) io.to(room).emit(event, payload);
    else io.emit(event, payload);
  } catch (_) { /* non-critical */ }
};

// Role → what stage they can forward FROM
// Gen Sec creates → forwards to PRESIDENT
// President reviews → forwards to ADOSA
// ADOSA approves/rejects per student
const ROLE_TO_NEXT_STATUS = {
  gen_sec:   'PENDING_PRESIDENT',
  president: 'PENDING_ADOSA',
};

// ── GET /api/night/lists ──────────────────────────────────────────────────────

export const getLists = async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [lists, total] = await Promise.all([
      NightPermissionList.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name email')
        .populate('presidentReviewedBy', 'name')
        .populate('adosaReviewedBy', 'name'),
      NightPermissionList.countDocuments(query),
    ]);

    res.status(200).json({ lists, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('❌ getLists error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/night/lists/review ───────────────────────────────────────────────
// Returns lists pending the current user's role

export const getListsForReview = async (req, res) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    let statusFilter;

    if (role === 'president') statusFilter = 'PENDING_PRESIDENT';
    else if (role === 'adosa' || role === 'admin') statusFilter = 'PENDING_ADOSA';
    else if (role === 'gen_sec') statusFilter = 'DRAFT';
    else return res.status(200).json({ lists: [] });

    const lists = await NightPermissionList.find({ status: statusFilter })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    res.status(200).json({ lists });
  } catch (err) {
    console.error('❌ getListsForReview error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/night/lists/:listId ──────────────────────────────────────────────

export const getListById = async (req, res) => {
  try {
    const list = await NightPermissionList.findById(req.params.listId)
      .populate('createdBy', 'name email')
      .populate('presidentReviewedBy', 'name')
      .populate('adosaReviewedBy', 'name');

    if (!list) return res.status(404).json({ message: 'List not found' });
    res.status(200).json(list);
  } catch (err) {
    console.error('❌ getListById error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/night/lists ─────────────────────────────────────────────────────
// Gen Sec or President creates a permission list

export const createList = async (req, res) => {
  try {
    const {
      societyName, eventName, venueName, venueHall,
      startDateTime, endDateTime, description, attachments, studentRollNos,
    } = req.body;

    if (!societyName || !eventName || !venueName || !startDateTime || !endDateTime) {
      return res.status(400).json({ message: 'societyName, eventName, venueName, startDateTime, endDateTime are required' });
    }
    if (!studentRollNos || studentRollNos.length === 0) {
      return res.status(400).json({ message: 'At least one student rollNo required' });
    }

    const start = new Date(startDateTime);
    const end   = new Date(endDateTime);
    if (end <= start) return res.status(400).json({ message: 'endDateTime must be after startDateTime' });

    // Resolve students from DB
    const rollNos  = studentRollNos.map(r => String(r).trim().toUpperCase());
    const students = await NightStudent.find({ rollNo: { $in: rollNos } });
    const foundSet = new Set(students.map(s => s.rollNo));

    // Check blocked students
    const blocked = students.filter(s => s.defaulterBlocked);
    if (blocked.length > 0) {
      return res.status(400).json({
        message: `These students are blocked and cannot be added: ${blocked.map(s => s.rollNo).join(', ')}`,
      });
    }

    const notFound = rollNos.filter(r => !foundSet.has(r));
    if (notFound.length > 0) {
      return res.status(400).json({ message: `Students not found in system: ${notFound.join(', ')}` });
    }

    const studentEntries = students.map(s => ({
      rollNo: s.rollNo, name: s.name, email: s.email,
      hostel: s.hostel, roomNo: s.roomNo, status: 'PENDING',
    }));

    const list = await NightPermissionList.create({
      societyName, eventName, venueName, venueHall: venueHall || '',
      startDateTime: start, endDateTime: end,
      description: description || '',
      attachments: attachments || [],
      students: studentEntries,
      status: 'DRAFT',
      createdBy: req.user._id,
      createdByName: req.user.name || '',
    });

    emitSafe('np:list-created', { listId: list._id, societyName, status: 'DRAFT' }, 'night-permissions');

    res.status(201).json({ message: 'Permission list created', list });
  } catch (err) {
    console.error('❌ createList error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/night/lists/:listId/send ───────────────────────────────────────
// Gen Sec → PENDING_PRESIDENT | President → PENDING_ADOSA

export const sendListForward = async (req, res) => {
  try {
    const role     = (req.user?.role || '').toLowerCase();
    const nextStatus = ROLE_TO_NEXT_STATUS[role];
    if (!nextStatus) return res.status(403).json({ message: 'Your role cannot forward lists' });

    const list = await NightPermissionList.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    // Validate current status matches role
    if (role === 'gen_sec' && list.status !== 'DRAFT') {
      return res.status(400).json({ message: `List must be in DRAFT status. Current: ${list.status}` });
    }
    if (role === 'president' && list.status !== 'PENDING_PRESIDENT') {
      return res.status(400).json({ message: `List must be in PENDING_PRESIDENT status. Current: ${list.status}` });
    }

    const prevStatus = list.status;

    if (role === 'president') {
      list.presidentReviewedBy = req.user._id;
      list.presidentReviewedAt = new Date();
      list.presidentRemarks    = req.body.remarks || '';
    }
    list.status = nextStatus;
    await list.save();

    emitSafe('np:list-forwarded', {
      listId: list._id, fromRole: role.toUpperCase(),
      toRole: nextStatus.replace('PENDING_', ''), prevStatus,
    }, 'night-permissions');

    res.status(200).json({ message: `List forwarded to ${nextStatus}`, list });
  } catch (err) {
    console.error('❌ sendListForward error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/night/lists/:listId/approve ────────────────────────────────────
// ADOSA approves selected students, creates sessions + venue booking

export const approveStudents = async (req, res) => {
  try {
    const { approvedRollNos, adosaRemarks } = req.body;

    if (!approvedRollNos || approvedRollNos.length === 0) {
      return res.status(400).json({ message: 'approvedRollNos array required' });
    }

    const list = await NightPermissionList.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });
    if (list.status !== 'PENDING_ADOSA') {
      return res.status(400).json({ message: `List must be PENDING_ADOSA. Current: ${list.status}` });
    }

    const settings = await getSettings();
    const approvedSet = new Set(approvedRollNos.map(r => String(r).trim().toUpperCase()));
    const approvedStudentIds = [];

    // Update per-student status
    for (const s of list.students) {
      if (approvedSet.has(s.rollNo)) {
        s.status = 'APPROVED';
        approvedStudentIds.push(s.rollNo);
      } else if (s.status === 'PENDING') {
        s.status = 'REJECTED';
      }
    }

    list.status          = 'APPROVED';
    list.adosaReviewedBy = req.user._id;
    list.adosaReviewedAt = new Date();
    list.adosaRemarks    = adosaRemarks || '';
    await list.save();

    // Create PermissionSession for each approved student
    const approvedStudents = await NightStudent.find({ rollNo: { $in: [...approvedSet] } });

    const sessionDocs = approvedStudents.map(student => ({
      permissionListId: list._id,
      studentId: student._id,
      rollNo: student.rollNo,
      name:   student.name,
      venueName: list.venueName,
      venueHall: list.venueHall || '',
      permissionStartDateTime: list.startDateTime,
      permissionEndDateTime:   list.endDateTime,
      allowedToVenueMinutes:   settings.defaultToVenueTimerMinutes,
      allowedToHostelMinutes:  settings.defaultToHostelTimerMinutes,
      currentPhase: 'NOT_STARTED',
    }));

    if (sessionDocs.length > 0) {
      await PermissionSession.insertMany(sessionDocs);
    }

    // Create linked venue booking (read-only marker in venue dashboard)
    try {
      const vb = await VenueBooking.create({
        hall: list.venueHall || 'Night Permission',
        roomNo: list.venueName,
        name: list.createdByName || 'Night Permission',
        societyName: list.societyName,
        eventName: list.eventName,
        contact: '0000000000',
        email: 'nightpermission@thapar.edu',
        checkInDate:  list.startDateTime.toISOString().slice(0, 10),
        checkInTime:  list.startDateTime.toISOString().slice(11, 16),
        checkOutDate: list.endDateTime.toISOString().slice(0, 10),
        checkOutTime: list.endDateTime.toISOString().slice(11, 16),
        purpose: 'Night Permission',
        description: `Night permission for ${approvedStudentIds.length} student(s). Society: ${list.societyName}`,
        attachments: [],
        status: 'booked',
        createdBy: req.user._id,
        bookingType: 'venue',
        isVenueBooking: true,
        isHallBooking: false,
        _isNightPermission: true,
      });

      list.venueBookingId = vb._id;
      await list.save();

      emitSafe('venueBookingCreated', { bookings: [vb], type: 'night-permission', isolated: true });
    } catch (vbErr) {
      console.error('⚠️ Venue booking creation failed (non-critical):', vbErr.message);
    }

    emitSafe('np:list-approved', {
      listId: list._id, approvedStudentIds,
      startDateTime: list.startDateTime, endDateTime: list.endDateTime,
    }, 'night-permissions');

    res.status(200).json({ message: `${approvedStudentIds.length} student(s) approved`, list });
  } catch (err) {
    console.error('❌ approveStudents error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/night/lists/:listId/reject ─────────────────────────────────────
// ADOSA rejects the entire list or selected students

export const rejectStudents = async (req, res) => {
  try {
    const { rejectedRollNos, reason } = req.body;

    const list = await NightPermissionList.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });
    if (list.status !== 'PENDING_ADOSA') {
      return res.status(400).json({ message: `List must be PENDING_ADOSA. Current: ${list.status}` });
    }

    if (rejectedRollNos && rejectedRollNos.length > 0) {
      const rejectSet = new Set(rejectedRollNos.map(r => String(r).trim().toUpperCase()));
      for (const s of list.students) {
        if (rejectSet.has(s.rollNo)) {
          s.status = 'REJECTED';
          s.rejectionReason = reason || '';
        }
      }
    } else {
      // Reject all pending students
      for (const s of list.students) {
        if (s.status === 'PENDING') {
          s.status = 'REJECTED';
          s.rejectionReason = reason || '';
        }
      }
    }

    // If all students rejected, mark list REJECTED
    const allRejected = list.students.every(s => s.status === 'REJECTED');
    list.status = allRejected ? 'REJECTED' : 'APPROVED';
    list.adosaReviewedBy = req.user._id;
    list.adosaReviewedAt = new Date();
    list.adosaRemarks    = reason || '';
    await list.save();

    emitSafe('np:list-rejected', {
      listId: list._id,
      rejectedStudentIds: list.students.filter(s => s.status === 'REJECTED').map(s => s.rollNo),
    }, 'night-permissions');

    res.status(200).json({ message: 'Students rejected', list });
  } catch (err) {
    console.error('❌ rejectStudents error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/night/lists/:listId/cancel ────────────────────────────────────

export const cancelList = async (req, res) => {
  try {
    const list = await NightPermissionList.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });
    if (['CANCELLED', 'APPROVED'].includes(list.status)) {
      return res.status(400).json({ message: `Cannot cancel a ${list.status} list` });
    }

    list.status      = 'CANCELLED';
    list.cancelledBy = req.user._id;
    list.cancelledAt = new Date();
    list.cancelReason = req.body.reason || '';
    await list.save();

    // Cancel linked venue booking if exists
    if (list.venueBookingId) {
      try {
        await VenueBooking.findByIdAndUpdate(list.venueBookingId, {
          status: 'cancelled', cancelledAt: new Date(),
          cancellationRemarks: 'Night permission list cancelled',
        });
      } catch (_) {}
    }

    res.status(200).json({ message: 'List cancelled', list });
  } catch (err) {
    console.error('❌ cancelList error:', err);
    res.status(500).json({ message: err.message });
  }
};
