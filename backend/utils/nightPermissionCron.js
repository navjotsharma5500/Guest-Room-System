// backend/utils/nightPermissionCron.js
// Added to existing cron infrastructure in cronJobs.js
// Runs every 5 minutes to enforce scan deadlines
import cron from 'node-cron';
import PermissionSession from '../models/PermissionSession.js';
import NightStudent from '../models/NightStudent.js';
import { getSettings } from '../models/NightSystemSettings.js';

export const runNightPermissionTimeoutCheck = async (io) => {
  const now     = new Date();
  const summary = { checked: 0, markedDefaulter: 0, blocked: 0, errors: [] };

  try {
    const settings = await getSettings();

    const expiredToVenue  = await PermissionSession.find({ currentPhase: 'GOING_TO_VENUE',      deadlineToVenue:  { $lt: now } });
    const expiredToHostel = await PermissionSession.find({ currentPhase: 'RETURNING_TO_HOSTEL', deadlineToHostel: { $lt: now } });

    const allExpired = [
      ...expiredToVenue.map(s  => ({ session: s, reason: 'LATE_TO_VENUE'  })),
      ...expiredToHostel.map(s => ({ session: s, reason: 'LATE_TO_HOSTEL' })),
    ];

    summary.checked = allExpired.length;

    for (const { session, reason } of allExpired) {
      try {
        session.isDefaulter     = true;
        session.defaulterReason = reason;
        session.currentPhase    = 'DEFAULTER';
        await session.save();

        const student = await NightStudent.findByIdAndUpdate(
          session.studentId,
          { $inc: { defaulterCount: 1 }, isDefaulter: true },
          { new: true }
        );

        if (student && student.defaulterCount >= settings.defaulterStrikeLimit) {
          await NightStudent.findByIdAndUpdate(session.studentId, { defaulterBlocked: true });
          summary.blocked++;
        }

        summary.markedDefaulter++;

        try {
          if (io) {
            io.to('night-permissions').emit('np:student-defaulter', {
              studentId: session.studentId, rollNo: session.rollNo,
              reason, phase: 'DEFAULTER', source: 'cron-timeout',
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
