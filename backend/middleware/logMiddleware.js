import Log from "../models/Log.js";

export const createLog = async (action, userId, meta = {}) => {
  try {
    await Log.create({
      action,
      user: userId || null,
      meta
    });
  } catch (err) {
    console.log("Log Error:", err);
  }
};
