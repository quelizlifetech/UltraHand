const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");
const {
  registerDoctorSchema,
  loginSchema,
} = require("../utils/validators");

router.post(
  "/register-doctor",
  validate(registerDoctorSchema),
  asyncHandler(ctrl.registerDoctor)
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(ctrl.login)
);

router.get("/me", authenticate, asyncHandler(ctrl.me));

/* ============================================================
   🆕 FORGOT PASSWORD ROUTES (public — no auth required)
   ============================================================ */
router.post(
  "/forgot-password",
  asyncHandler(ctrl.forgotPassword)
);

router.post(
  "/verify-otp",
  asyncHandler(ctrl.verifyOtp)
);

router.post(
  "/reset-password",
  asyncHandler(ctrl.resetPassword)
);

module.exports = router;