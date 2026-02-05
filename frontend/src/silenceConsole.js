// 🔇 Silence console logs in production (frontend only)
if (process.env.NODE_ENV === "production") {
  window.console.log = () => {};
  window.console.info = () => {};
  window.console.warn = () => {};
  window.console.debug = () => {};
}
