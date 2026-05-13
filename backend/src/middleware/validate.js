const ApiError = require("../utils/ApiError");

module.exports = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    // 🔥 FULL DEBUG LOGS
    console.error("🔥 ZOD VALIDATION ERROR");
    console.error("====================================");

    // Full request body
    console.log("📦 REQUEST BODY:");
    console.dir(req.body, { depth: null });

    console.log("====================================");

    // Full Zod error
    console.log("❌ ZOD ERRORS:");
    console.dir(result.error.flatten(), {
      depth: null,
    });

    console.log("====================================");

    return next(
      new ApiError(
        400,
        "Validation failed",
        result.error.flatten()
      )
    );
  }

  // ✅ Use parsed/coerced values
  req.body = result.data;

  next();
};