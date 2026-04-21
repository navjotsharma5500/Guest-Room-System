export const asyncSendEmails = (fn) => {
  setImmediate(async () => {
    try {
      await fn();
    } catch (err) {
      console.error("❌ Async email error:", err);
    }
  });
};
