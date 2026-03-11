// backend/controllers/permissionListController.js
import { getSocketIO } from '../utils/socket.js';
import NightPermissionList from '../models/NightPermissionList.js';
import NightStudent from '../models/NightStudent.js';
import PermissionSession from '../models/PermissionSession.js';
import VenueBooking from '../models/VenueBooking.js';
import EventNameSuggestion from '../models/EventNameSuggestion.js';
import { getSettings } from '../models/NightSystemSettings.js';

// ── helpers ──────────────────────────────────────────────────────────────────

const touchEventSuggestion = async (name = "") => {
  const normalized = String(name || "").trim();
  if (!normalized) return;
  try {
    await EventNameSuggestion.findOneAndUpdate(
      { name: normalized },
      { $inc: { usageCount: 1 }, $set: { lastUsed: new Date() } },
      { upsert: true, new: true }
    );
  } catch (_) {}
};

const emitSafe = (event, payload, room = null) => {
  try {
    const io = getSocketIO();
    if (room) io.to(room).emit(event, payload);
    else io.emit(event, payload);
  } catch (_) { /* non-critical */ }
};

const APPLICATION_CUTOFF_MESSAGE = 'Night pass applications are closed for today.';

const isAfterDailyCutoff = (cutoffTime, now = new Date()) => {
  const match = String(cutoffTime || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return false;

  const cutoffAt = new Date(now);
  cutoffAt.setHours(hours, minutes, 0, 0);
  return now > cutoffAt;
};

const enforceApplicationCutoff = async () => {
  const settings = await getSettings();
  if (isAfterDailyCutoff(settings.lastApplyAllowedTime)) {
    const error = new Error(APPLICATION_CUTOFF_MESSAGE);
    error.statusCode = 403;
    throw error;
  }
  return settings;
};

const getStudentsWithActiveSessions = async (students = []) => {
  const studentIds = [...new Set(
    students
      .map((student) => student?._id?.toString())
      .filter(Boolean)
  )];

  if (studentIds.length === 0) return [];

  const sessions = await PermissionSession.find({
    studentId: { $in: studentIds },
    currentPhase: { $nin: ['COMPLETED', 'DEFAULTER'] },
  }).select('studentId rollNo currentPhase');

  return sessions;
};

const ensureNoActiveSessions = async (students = []) => {
  const activeSessions = await getStudentsWithActiveSessions(students);
  if (activeSessions.length === 0) return;

  const activeRollNos = [...new Set(activeSessions.map((session) => session.rollNo).filter(Boolean))];
  const error = new Error(
    `Active night permission session already exists for: ${activeRollNos.join(', ')}`
  );
  error.statusCode = 400;
  throw error;
};

const buildDailyPermissionWindows = (rangeStart, rangeEnd) => {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error('Invalid permission date range');
    error.statusCode = 400;
    throw error;
  }

  const startHours = start.getHours();
  const startMinutes = start.getMinutes();
  const startSeconds = start.getSeconds();
  const startMilliseconds = start.getMilliseconds();

  const endHours = end.getHours();
  const endMinutes = end.getMinutes();
  const endSeconds = end.getSeconds();
  const endMilliseconds = end.getMilliseconds();

  const windows = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  const lastDay = new Date(end);
  lastDay.setHours(0, 0, 0, 0);

  while (cursor <= lastDay) {
    const sessionStart = new Date(cursor);
    sessionStart.setHours(startHours, startMinutes, startSeconds, startMilliseconds);

    const sessionEnd = new Date(cursor);
    sessionEnd.setHours(endHours, endMinutes, endSeconds, endMilliseconds);

    if (sessionEnd <= sessionStart) {
      const error = new Error('Daily permission end time must be after start time');
      error.statusCode = 400;
      throw error;
    }

    windows.push({
      permissionStartDateTime: sessionStart,
      permissionEndDateTime: sessionEnd,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return windows;
};

const buildSessionDocsForDateRange = ({ list, students, settings }) => {
  const dailyWindows = buildDailyPermissionWindows(list.startDateTime, list.endDateTime);
  const sessionDocs = [];

  for (const student of students) {
    for (const window of dailyWindows) {
      sessionDocs.push({
        permissionListId: list._id,
        studentId: student._id,
        rollNo: student.rollNo,
        name: student.name,
        venueName: list.venueName,
        venueHall: list.venueHall || '',
        permissionStartDateTime: window.permissionStartDateTime,
        permissionEndDateTime: window.permissionEndDateTime,
        allowedToVenueMinutes: settings.defaultToVenueTimerMinutes,
        allowedToHostelMinutes: settings.defaultToHostelTimerMinutes,
        currentPhase: 'NOT_STARTED',
      });
    }
  }

  return sessionDocs;
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

    const role = (req.user?.role || '').toLowerCase();
    const userId = req.user?._id;

    // Visibility rules:
    // 1. Admin/ADOSA/Assistant see everything
    // 2. Gen Sec / President see only their allowed societies
    // 3. Students see only if they are IN the list
    if (role === 'student') {
      const studentRollNo = req.user?.rollNo || '';
      query['students.rollNo'] = studentRollNo;
    } else if (role === 'gen_sec' || role === 'president') {
      const userSocieties = req.user?.societies || [];
      query.societyName = { $in: userSocieties };
    }

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

    if (role === 'gen_sec') statusFilter = 'STUDENT_REQUEST';
    else if (role === 'president') statusFilter = 'PENDING_PRESIDENT';
    else if (role === 'adosa' || role === 'admin') statusFilter = 'PENDING_ADOSA';
    else return res.status(200).json({ lists: [] });

    const query = { status: statusFilter };
    if (role === 'president' || role === 'gen_sec') {
      const userSocieties = req.user?.societies || [];
      query.societyName = { $in: userSocieties };
    }

    const lists = await NightPermissionList.find(query)
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

export const createList = async (req, res) => {
  try {
    const {
      societyName, eventName, venueName, venueHall,
      startDateTime, endDateTime, description, attachments, studentRollNos,
    } = req.body;

    if (!societyName || !eventName || !venueName || !startDateTime || !endDateTime) {
      return res.status(400).json({ message: 'societyName, eventName, venueName, startDateTime, endDateTime are required' });
    }

    const role = (req.user?.role || '').toLowerCase();
    const userSocieties = req.user?.societies || [];

    await enforceApplicationCutoff();

    // 1. Authorization: Allow roles: STUDENT, GEN_SEC, PRESIDENT, ADOSA, ADMIN
    const ALLOWED_CREATORS = ['student', 'gen_sec', 'president', 'adosa', 'admin'];
    if (!ALLOWED_CREATORS.includes(role)) {
      return res.status(403).json({ message: 'Your role is not authorized to create permission lists' });
    }

    // 2. Society validation for Gen Sec / President
    if (role === 'gen_sec' || role === 'president') {
      if (!userSocieties.includes(societyName)) {
        return res.status(403).json({ message: `You are not authorized to create lists for society: ${societyName}` });
      }
    }

    // Students can create for any society (request stage)
    
    let students = [];
    let studentEntries = [];

    if (role === 'student') {
      // Students create request for themselves only
      const studentDoc = await NightStudent.findOne({ email: req.user.email, isActive: true });
      if (!studentDoc) {
        return res.status(404).json({ message: 'Student master record not found' });
      }
      if (studentDoc.defaulterBlocked) {
        return res.status(403).json({ message: 'You are blocked from creating night pass requests' });
      }
      students = [studentDoc];
      studentEntries = [{
        rollNo: studentDoc.rollNo, name: studentDoc.name, email: studentDoc.email,
        hostel: studentDoc.hostel, roomNo: studentDoc.roomNo, status: 'PENDING',
      }];
    } else {
      if (!studentRollNos || studentRollNos.length === 0) {
        return res.status(400).json({ message: 'At least one student rollNo required' });
      }

      // Resolve students from DB
      const rollNos  = studentRollNos.map(r => String(r).trim().toUpperCase());
      const resolvedStudents = await NightStudent.find({ rollNo: { $in: rollNos } });
      const foundSet = new Set(resolvedStudents.map(s => s.rollNo));

      // Check blocked students
      const blocked = resolvedStudents.filter(s => s.defaulterBlocked);
      if (blocked.length > 0) {
        return res.status(400).json({
          message: `These students are blocked and cannot be added: ${blocked.map(s => s.rollNo).join(', ')}`,
        });
      }

      const notFound = rollNos.filter(r => !foundSet.has(r));
      if (notFound.length > 0) {
        return res.status(400).json({ message: `Students not found in system: ${notFound.join(', ')}` });
      }

      students = resolvedStudents;
      studentEntries = resolvedStudents.map(s => ({
        rollNo: s.rollNo, name: s.name, email: s.email,
        hostel: s.hostel, roomNo: s.roomNo, status: 'PENDING',
      }));
    }

    const start = new Date(startDateTime);
    const end   = new Date(endDateTime);
    if (end <= start) return res.status(400).json({ message: 'endDateTime must be after startDateTime' });

    // 3. Approval Stage Logic
    let initialStatus = 'DRAFT';
    if (role === 'student')   initialStatus = 'STUDENT_REQUEST';
    if (role === 'gen_sec')   initialStatus = 'PENDING_PRESIDENT';
    if (role === 'president') initialStatus = 'PENDING_ADOSA';
    if (role === 'adosa' || role === 'admin') initialStatus = 'APPROVED';

    const isAdminOrAdosa = initialStatus === 'APPROVED';
    if (isAdminOrAdosa) {
      await ensureNoActiveSessions(students);
    }

    const list = await NightPermissionList.create({
      societyName, eventName, venueName, venueHall: venueHall || '',
      startDateTime: start, endDateTime: end,
      description: description || '',
      attachments: attachments || [],
      students: studentEntries,
      status: initialStatus,
      createdBy: req.user._id,
      createdByName: req.user.name || '',
      adosaReviewedBy: isAdminOrAdosa ? req.user._id : null,
      adosaReviewedAt: isAdminOrAdosa ? new Date() : null,
      adosaRemarks: isAdminOrAdosa ? 'Auto-approved by Admin/ADOSA' : '',
    });

    // Auto-save event name
    await touchEventSuggestion(eventName);

    // Handle auto-approval side-effects
    if (isAdminOrAdosa) {
      try {
        const settings = await getSettings();
        
        // Mark all as APPROVED
        for (const s of list.students) {
          s.status = 'APPROVED';
        }
        await list.save();

        // Create Sessions
        const sessionDocs = buildSessionDocsForDateRange({ list, students, settings });

        if (sessionDocs.length > 0) {
          await PermissionSession.insertMany(sessionDocs);
        }

        // Create Venue Booking
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
          description: `Night permission for ${students.length} student(s). Society: ${list.societyName} (Auto-approved)`,
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
        emitSafe('np:list-approved', {
          listId: list._id, 
          approvedStudentIds: students.map(s => s.rollNo),
          startDateTime: list.startDateTime, 
          endDateTime: list.endDateTime,
        }, 'night-permissions');
      } catch (autoErr) {
        console.error('⚠️ Auto-approval side-effects failed:', autoErr.message);
      }
    } else {
      emitSafe('np:list-created', { listId: list._id, societyName, status: initialStatus }, 'night-permissions');
    }

    res.status(201).json({ message: isAdminOrAdosa ? 'Permission list created and auto-approved' : 'Permission list created', list });
  } catch (err) {
    console.error('❌ createList error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── POST /api/night/requests ─────────────────────────────────────────────────
// Student creates a single request for themselves
export const createStudentRequest = async (req, res) => {
  try {
    const { societyName, eventName, venueName, startDateTime, endDateTime, description } = req.body;

    await enforceApplicationCutoff();

    // 1. Get student record
    // Use regex for case-insensitive email match
    const student = await NightStudent.findOne({ 
      email: { $regex: new RegExp(`^${req.user.email}$`, 'i') } 
    });

    if (!student) {
      return res.status(403).json({ message: "Student record not found in master list" });
    }

    if (student.defaulterBlocked) {
      return res.status(403).json({ message: "You are blocked from creating requests due to defaulter status" });
    }

    // 2. Validate inputs
    if (!startDateTime || !endDateTime) {
      return res.status(400).json({ message: "Start and End times are required" });
    }
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Invalid dates" });
    }
    if (start >= end) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    // 3. Create List (Single Student)
    const list = new NightPermissionList({
      societyName: societyName || "Individual",
      eventName: eventName || "Night Pass Request",
      venueName: venueName || "Other",
      description: description || "",
      startDateTime: start,
      endDateTime: end,
      students: [{
        rollNo: student.rollNo,
        name: student.name,
        email: student.email,
        hostel: student.hostel,
        roomNo: student.roomNo,
        status: 'PENDING' // Individual status
      }],
      status: 'STUDENT_REQUEST', // Overall list status
      createdBy: req.user._id
    });

    await list.save();

    // Emit event for real-time updates
    emitSafe('np:list-created', { 
      listId: list._id, 
      societyName: list.societyName, 
      status: list.status 
    }, 'night-permissions');

    res.status(201).json({ message: "Request submitted successfully", list });

  } catch (err) {
    console.error('❌ createStudentRequest error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
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
    if (role === 'gen_sec' && !['DRAFT', 'STUDENT_REQUEST'].includes(list.status)) {
      return res.status(400).json({ message: `List must be in DRAFT or STUDENT_REQUEST status. Current: ${list.status}` });
    }
    if (role === 'president' && list.status !== 'PENDING_PRESIDENT') {
      return res.status(400).json({ message: `List must be in PENDING_PRESIDENT status. Current: ${list.status}` });
    }

    const prevStatus = list.status;

    if (role === 'president') {
      list.presidentReviewedBy = req.user._id;
      list.presidentReviewedAt = new Date();
      list.presidentRemarks    = req.body.remarks || '';

      // ✅ Handle selection: If user provided `selectedRollNos`
      if (req.body.selectedRollNos && Array.isArray(req.body.selectedRollNos)) {
        const selectedSet = new Set(req.body.selectedRollNos.map(r => String(r).trim().toUpperCase()));
        for (const s of list.students) {
           // If student is NOT selected, mark them as REJECTED by President
           if (!selectedSet.has(s.rollNo) && s.status === 'PENDING') {
             s.status = 'REJECTED'; 
           }
        }
      }
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
    const approvedStudents = await NightStudent.find({ rollNo: { $in: [...approvedSet] } });
    await ensureNoActiveSessions(approvedStudents);

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
    const sessionDocs = buildSessionDocsForDateRange({
      list,
      students: approvedStudents,
      settings,
    });

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
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── GET /api/night/calendar ──────────────────────────────────────────────────
export const getCalendarEvents = async (req, res) => {
  try {
    const { from, to, tab } = req.query;
    const role = (req.user?.role || '').toLowerCase();
    const userId = req.user?._id;
    const societies = req.user?.societies || [];

    const query = {};

    // 1. Role-based visibility
    if (role === 'student') {
      query['students.rollNo'] = req.user?.rollNo;
    } else if (role === 'gen_sec' || role === 'president') {
      query.societyName = { $in: societies };
    }

    // 2. Tab-based status filtering
    const now = new Date();
    if (tab === 'UPCOMING') {
      query.status = 'APPROVED';
      query.startDateTime = { $gt: now };
    } else if (tab === 'ACTIVE') {
      query.status = 'APPROVED';
      query.startDateTime = { $lte: now };
      query.endDateTime = { $gte: now };
    } else if (tab === 'PAST') {
      query.status = 'APPROVED';
      query.endDateTime = { $lt: now };
    } else if (tab === 'CANCELLED') {
      query.status = 'CANCELLED';
    } else {
      // Default: show all relevant non-draft
      query.status = { $in: ['APPROVED', 'PENDING_ADOSA', 'PENDING_PRESIDENT', 'CANCELLED'] };
    }

    // 3. Date range filtering (if provided)
    if (from) {
      query.startDateTime = { ...(query.startDateTime || {}), $gte: new Date(from) };
    }
    if (to) {
      query.endDateTime = { ...(query.endDateTime || {}), $lte: new Date(to) };
    }

    const lists = await NightPermissionList.find(query).sort({ startDateTime: -1 });
    res.status(200).json(lists);
  } catch (err) {
    console.error('❌ getCalendarEvents error:', err);
    res.status(500).json({ success: false, message: err.message });
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
