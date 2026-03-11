// backend/utils/nightPermissionCron.js
// Added to existing cron infrastructure in cronJobs.js
// Runs every 5 minutes to enforce scan deadlines
import cron from 'node-cron';
import PermissionSession from '../models/PermissionSession.js';
import NightStudent from '../models/NightStudent.js';
import { getSettings } from '../models/NightSystemSettings.js';

const applyDefaulterStrike = async (studentId, strikeLimit) => {
  const student = await NightStudent.findByIdAndUpdate(
    studentId,
    { $inc: { defaulterCount: 1 }, isDefaulter: true },
    { new: true }
  );

  if (student && student.defaulterCount >= strikeLimit) {
    await NightStudent.findByIdAndUpdate(studentId, { defaulterBlocked: true });
    return { student, blocked: true };
  }

  return { student, blocked: false };
};

const getSessionTimeoutReason = (session, now) => {
  if (!session) return null;

  if (session.currentPhase === 'NOT_STARTED' && now > session.permissionEndDateTime) {
    return 'MISSED_HOSTEL_EXIT';
  }

  if (
    session.currentPhase === 'GOING_TO_VENUE'
    && session.deadlineToVenue
    && now > session.deadlineToVenue
  ) {
    return 'LATE_TO_VENUE';
  }

  if (session.currentPhase === 'AT_VENUE' && now > session.permissionEndDateTime) {
    return 'MISSED_VENUE_EXIT';
  }

  if (
    session.currentPhase === 'RETURNING_TO_HOSTEL'
    && session.deadlineToHostel
    && now > session.deadlineToHostel
  ) {
    return 'LATE_TO_HOSTEL';
  }

  return null;
};

export const runNightPermissionTimeoutCheck = async (io) => {
  const now     = new Date();
  const summary = { checked: 0, markedDefaulter: 0, blocked: 0, errors: [] };

  try {
    const settings = await getSettings();

    const candidateSessions = await PermissionSession.find({
      currentPhase: { $in: ['NOT_STARTED', 'GOING_TO_VENUE', 'AT_VENUE', 'RETURNING_TO_HOSTEL'] },
      permissionStartDateTime: { $lte: now },
    });

    summary.checked = candidateSessions.length;

    for (const session of candidateSessions) {
      try {
        const reason = getSessionTimeoutReason(session, now);
        if (!reason) continue;

        session.isDefaulter     = true;
        session.defaulterReason = reason;
        session.currentPhase    = 'DEFAULTER';
        await session.save();

        const { blocked } = await applyDefaulterStrike(
          session.studentId,
          settings.defaulterStrikeLimit
        );

        if (blocked) {
          summary.blocked++;
        }

        summary.markedDefaulter++;

        try {
          if (io) {
            io.to('night-permissions').emit('np:student-defaulter', {
              studentId: session.studentId, rollNo: session.rollNo,
              reason, phase: 'DEFAULTER', source: 'cron-timeout',
              sessionId: session._id,
              sessionDate: session.permissionStartDateTime?.toISOString?.().slice(0, 10) || null,
              timestamp: now.toISOString(),
            });
          }
        } catch (_) {}

      } catch (sessionErr) {
        summary.errors.push({ sessionId: session._id, error: sessionErr.message });
      }
    }
  } catch (err) {
    summary.errors.push({ global: err.message });
    console.error('❌ Night permission timeout cron error:', err);
  }

  return summary;
};

export const startNightPermissionTimeoutCron = (io) => {
  console.log('🟢 Starting night permission timeout cron (every 5 min)...');

  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Running night permission timeout check...`);

    const result = await runNightPermissionTimeoutCheck(io);

    if (result.markedDefaulter > 0) {
      console.log(`🚨 Night perm cron: ${result.markedDefaulter} defaulter(s), ${result.blocked} blocked`);
      try {
        if (io) {
          io.to('night-permissions').emit('np:timeout-sweep', {
            markedDefaulter: result.markedDefaulter, blocked: result.blocked,
            timestamp: now.toISOString(),
          });
        }
      } catch (_) {}
    } else {
      console.log('✅ Night permission timeout check: no expired sessions');
    }

    if (result.errors.length) console.error('⚠️ Timeout cron errors:', result.errors);
  });

  console.log('✅ Night permission timeout cron started — every 5 minutes');
};
