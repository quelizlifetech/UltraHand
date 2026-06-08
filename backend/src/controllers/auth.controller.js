const svc = require("../services/auth.service");

/* ----------------------------
   REGISTER DOCTOR
-----------------------------*/
exports.registerDoctor = async (req, res) => {
  const data = await svc.registerDoctor(req.body);
  res.status(201).json(data);
};

/* ----------------------------
   LOGIN
-----------------------------*/
exports.login = async (req, res) => {
  const data = await svc.login(req.body);
  res.json(data);
};

/* ----------------------------
   CURRENT USER
-----------------------------*/
exports.me = async (req, res) => {
  const user = await svc.me(req.user.id);
  res.json({ user });
};

/* ============================================================
   🆕 FORGOT PASSWORD — STEP 1: REQUEST OTP
   POST /api/auth/forgot-password
   ============================================================ */
exports.forgotPassword = async (req, res) => {
  const result = await svc.forgotPassword(req.body);
  res.json(result);
};

/* ============================================================
   🆕 FORGOT PASSWORD — STEP 2: VERIFY OTP
   POST /api/auth/verify-otp
   ============================================================ */
exports.verifyOtp = async (req, res) => {
  const result = await svc.verifyOtp(req.body);
  res.json(result);
};

/* ============================================================
   🆕 FORGOT PASSWORD — STEP 3: RESET PASSWORD
   POST /api/auth/reset-password
   ============================================================ */
exports.resetPassword = async (req, res) => {
  const result = await svc.resetPassword(req.body);
  res.json(result);
};