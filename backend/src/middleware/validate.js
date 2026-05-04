const ApiError = require("../utils/ApiError");

module.exports = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(new ApiError(400, "Validation failed", result.error.flatten()));
  }
  req.body = result.data;
  next();
};
