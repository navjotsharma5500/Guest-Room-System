// backend/emails/sendEmail.js
import transporter from "../utils/smtpTransport.js";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ========================================
// 📊 EMAIL RATE LIMITING CONFIGURATION
// ========================================
const EMAIL_LIMITS = {
  PER_HOUR: 100,        // Max emails per hour
  PER_DAY: 500,         // Max emails per day (Gmail Workspace limit)
  DELAY_BETWEEN: 2500,  // 2.5 seconds between emails
  RETRY_DELAY: 2000,    // 2 seconds between retries
  MAX_RETRIES: 3
};

// ========================================
// 📈 RATE LIMITER CLASS
// ========================================
class EmailRateLimiter {
  constructor() {
    this.hourlyCount = 0;
    this.dailyCount = 0;
    this.lastResetHour = new Date().getHours();
    this.lastResetDay = new Date().getDate();
    this.lastEmailTime = 0;
  }

  resetCounters() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDate();

    // Reset hourly counter
    if (currentHour !== this.lastResetHour) {
      console.log(`🔄 Hourly reset: ${this.hourlyCount} emails sent last hour`);
      this.hourlyCount = 0;
      this.lastResetHour = currentHour;
    }

    // Reset daily counter
    if (currentDay !== this.lastResetDay) {
      console.log(`🔄 Daily reset: ${this.dailyCount} emails sent yesterday`);
      this.dailyCount = 0;
      this.lastResetDay = currentDay;
    }
  }

  canSend() {
    this.resetCounters();

    if (this.hourlyCount >= EMAIL_LIMITS.PER_HOUR) {
      console.warn(`⚠️ HOURLY LIMIT: ${this.hourlyCount}/${EMAIL_LIMITS.PER_HOUR}`);
      return { allowed: false, reason: 'hourly_limit' };
    }

    if (this.dailyCount >= EMAIL_LIMITS.PER_DAY) {
      console.warn(`⚠️ DAILY LIMIT: ${this.dailyCount}/${EMAIL_LIMITS.PER_DAY}`);
      return { allowed: false, reason: 'daily_limit' };
    }

    return { allowed: true };
  }

  recordSent() {
    this.resetCounters();
    this.hourlyCount++;
    this.dailyCount++;
    this.lastEmailTime = Date.now();
    
    console.log(`📊 Email Stats: Hourly ${this.hourlyCount}/${EMAIL_LIMITS.PER_HOUR} | Daily ${this.dailyCount}/${EMAIL_LIMITS.PER_DAY}`);
  }

  async enforceDelay() {
    const timeSinceLastEmail = Date.now() - this.lastEmailTime;
    const delayNeeded = EMAIL_LIMITS.DELAY_BETWEEN - timeSinceLastEmail;

    if (delayNeeded > 0) {
      console.log(`⏳ Rate limiting: waiting ${delayNeeded}ms`);
      await sleep(delayNeeded);
    }
  }

  getStats() {
    this.resetCounters();
    return {
      hourly: {
        sent: this.hourlyCount,
        limit: EMAIL_LIMITS.PER_HOUR,
        remaining: EMAIL_LIMITS.PER_HOUR - this.hourlyCount,
        percentUsed: ((this.hourlyCount / EMAIL_LIMITS.PER_HOUR) * 100).toFixed(1)
      },
      daily: {
        sent: this.dailyCount,
        limit: EMAIL_LIMITS.PER_DAY,
        remaining: EMAIL_LIMITS.PER_DAY - this.dailyCount,
        percentUsed: ((this.dailyCount / EMAIL_LIMITS.PER_DAY) * 100).toFixed(1)
      }
    };
  }
}

const rateLimiter = new EmailRateLimiter();

// ========================================
// 📧 SEND EMAIL FUNCTION
// ========================================
export async function sendEmail({ to, subject, html, text, priority = 'normal' }) {
  // Check rate limits
  const limitCheck = rateLimiter.canSend();
  if (!limitCheck.allowed) {
    const error = new Error(`Email rate limit exceeded: ${limitCheck.reason}`);
    error.code = 'RATE_LIMIT_EXCEEDED';
    error.reason = limitCheck.reason;
    console.error(`❌ [EMAIL] Rate limit exceeded for ${to}: ${limitCheck.reason}`);
    throw error;
  }

  // Enforce delay between emails
  await rateLimiter.enforceDelay();

  // Retry loop
  for (let attempt = 1; attempt <= EMAIL_LIMITS.MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to,
        subject,
        text: text || "Please view this email in an HTML-compatible email client.",
        html,
        priority: priority === "high" ? "high" : undefined,
      });

      // Record successful send
      rateLimiter.recordSent();
      console.log(`✅ [EMAIL] Sent to ${to} (attempt ${attempt})`);
      return true;

    } catch (err) {
      console.error(`❌ [EMAIL] Failed attempt ${attempt}/${EMAIL_LIMITS.MAX_RETRIES} to ${to}:`, err.message);

      // Check if it's a Gmail rate limit error (421)
      if (err.message.includes("421") || err.message.includes("Temporary System Problem")) {
        console.error(`⚠️ [EMAIL] Gmail rate limit detected. Backing off...`);
        
        if (attempt < EMAIL_LIMITS.MAX_RETRIES) {
          // Exponential backoff for rate limit errors
          const backoffDelay = EMAIL_LIMITS.RETRY_DELAY * Math.pow(2, attempt - 1);
          console.log(`⏳ [EMAIL] Backing off for ${backoffDelay}ms before retry ${attempt + 1}`);
          await sleep(backoffDelay);
        }
      } else if (attempt < EMAIL_LIMITS.MAX_RETRIES) {
        // Normal retry delay for other errors
        await sleep(EMAIL_LIMITS.RETRY_DELAY);
      }
    }
  }

  console.error(`❌ [EMAIL] All retry attempts exhausted for ${to}`);
  return false;
}

// ========================================
// 🛡️ SAFE SEND WRAPPER WITH EMAIL LOGGING
// ========================================
export function safeSend(emailPayload, EmailLogModel = null) {
  // Validation
  if (!emailPayload?.to || String(emailPayload.to).trim() === "") {
    console.warn("⚠️ safeSend SKIPPED - No recipient email:", {
      type: emailPayload?.meta?.type,
      bookingId: emailPayload?.meta?.bookingId,
      enquiryId: emailPayload?.meta?.enquiryId
    });
    return Promise.resolve(false);
  }

  console.log("📧 safeSend called:", {
    to: emailPayload.to,
    subject: emailPayload.subject,
    type: emailPayload?.meta?.type
  });

  // Fire-and-forget email sending with optional EmailLog tracking
  return sendEmail(emailPayload)
    .then(() => {
      console.log("✅ Email sent successfully:", emailPayload.to);
      
      // Optional: Log to database if EmailLog model is provided
      if (EmailLogModel) {
        EmailLogModel.create({
          to: emailPayload.to,
          subject: emailPayload.subject,
          type: emailPayload.meta?.type,
          bookingId: emailPayload.meta?.bookingId,
          enquiryId: emailPayload.meta?.enquiryId,
          status: "sent",
        }).catch((err) => {
          console.error("EmailLog write failed:", err.message);
        });
      }
      
      return true;
    })
    .catch((err) => {
      console.error("❌ Email send failed:", emailPayload.to, err.message);
      
      // Optional: Log failure to database
      if (EmailLogModel) {
        EmailLogModel.create({
          to: emailPayload.to,
          subject: emailPayload.subject,
          type: emailPayload.meta?.type,
          bookingId: emailPayload.meta?.bookingId,
          enquiryId: emailPayload.meta?.enquiryId,
          status: "failed",
          error: err.message,
        }).catch((err) => {
          console.error("EmailLog write failed:", err.message);
        });
      }
      
      return false;
    });
}

// ========================================
// 📦 BULK EMAIL SENDER (for bulk operations)
// ========================================
export async function sendBulkEmails(emails, options = {}) {
  const {
    batchSize = 10,
    batchDelay = 30000,
    onProgress = null
  } = options;

  console.log(`📦 Starting bulk send: ${emails.length} emails`);

  const results = {
    total: emails.length,
    sent: 0,
    failed: 0,
    rateLimited: 0,
    errors: [] // ✅ ADD: Track error details
  };

  // Split into batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(emails.length / batchSize);

    console.log(`📧 Batch ${batchNum}/${totalBatches} (${batch.length} emails)`);

    for (const email of batch) {
      try {
        const success = await sendEmail(email);
        if (success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            to: email.to,
            error: "Send failed without exception"
          });
        }
      } catch (err) {
        if (err.code === 'RATE_LIMIT_EXCEEDED') {
          results.rateLimited++;
          results.errors.push({
            to: email.to,
            error: `Rate limit: ${err.reason}`
          });
        } else {
          results.failed++;
          results.errors.push({
            to: email.to,
            error: err.message || "Unknown error"
          });
        }
      }

      if (onProgress) {
        onProgress({
          current: results.sent + results.failed + results.rateLimited,
          total: emails.length,
          sent: results.sent,
          failed: results.failed,
          rateLimited: results.rateLimited
        });
      }
    }

    // Wait between batches (except last one)
    if (i + batchSize < emails.length) {
      console.log(`⏳ Waiting ${batchDelay}ms before next batch...`);
      await sleep(batchDelay);
    }
  }

  console.log(`📊 Bulk send complete:`, results);
  return results;
}

// ========================================
// 📊 GET EMAIL STATS
// ========================================
export function getEmailStats() {
  return rateLimiter.getStats();
}

// ========================================
// 🔄 RESET COUNTERS (for testing)
// ========================================
export function resetEmailCounters() {
  rateLimiter.hourlyCount = 0;
  rateLimiter.dailyCount = 0;
  console.log('🔄 Email counters manually reset');
}