import EmailLog from "../../models/EmailLog.js";

export const logEmail = async (context, subject, type, roomNo, status = "sent", error = null) => {
  try {
    await EmailLog.create({
      type,
      recipient: Array.isArray(context.to) ? context.to.join(", ") : context.to,
      subject,
      status,
      roomNo,
      error: error ? error.message : null,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to log email:", err);
  }
};