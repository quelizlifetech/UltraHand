const { verify } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

/**
 * -----------------------------------
 * AUTHENTICATE USER
 * Reads JWT token from:
 * Authorization: Bearer <token>
 * -----------------------------------
 */
const authenticate = (
  req,
  _res,
  next
) => {
  try {
    const header =
      req.headers.authorization || "";

    const token = header.startsWith(
      "Bearer "
    )
      ? header.slice(7)
      : null;

    if (!token) {
      return next(
        new ApiError(
          401,
          "Missing token"
        )
      );
    }

    const decoded =
      verify(token);

    /**
     * decoded contains:
     * {
     *   id,
     *   role,
     *   email?,
     *   phone?
     * }
     */

    req.user = decoded;

    next();
  } catch (error) {
    return next(
      new ApiError(
        401,
        "Invalid or expired token"
      )
    );
  }
};

/**
 * -----------------------------------
 * AUTHORIZE ROLE
 * Example:
 * authorize("doctor")
 * authorize("patient")
 * authorize("doctor","admin")
 * -----------------------------------
 */
const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(
        new ApiError(
          401,
          "Unauthorized"
        )
      );
    }

    if (
      !roles.includes(
        req.user.role
      )
    ) {
      return next(
        new ApiError(
          403,
          "Forbidden"
        )
      );
    }

    next();
  };

module.exports = {
  authenticate,
  authorize,
};