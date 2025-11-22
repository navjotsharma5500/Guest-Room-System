export const errorHandler = (err, req, res, next) => {
  console.error("❌ ERROR:", err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
  });
};
