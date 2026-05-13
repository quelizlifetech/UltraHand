module.exports = (err, req, res, next) => {
  console.error("🔥 ERROR CAUGHT BY MIDDLEWARE:");
  console.error(err);

  // Prisma errors (VERY IMPORTANT)
  if (err.code && err.code.startsWith("P")) {
    return res.status(400).json({
      success: false,
      message: "Database error",
      prisma: err.message,
    });
  }

  // Custom API error
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  // Fallback
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};