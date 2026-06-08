const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const { sign } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

const otpService = require("./otp.service");
const emailService = require("./email.service");

/* ----------------------------
   REGISTER DOCTOR
-----------------------------*/
async function registerDoctor({ name, email, password }) {
  const existing = await prisma.user.findFirst({
    where: { email },
  });

  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: "doctor",
      mustSetupProfile: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      mustChangePassword: true,
      mustSetupProfile: true,
    },
  });

  const token = sign({
    id: user.id,
    role: user.role,
    email: user.email,
  });

  return { user, token };
}

/* ----------------------------
   LOGIN
-----------------------------*/
async function login({ email, phone, password }) {
  let user = null;

  if (email) {
    user = await prisma.user.findFirst({
      where: { email },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });
  } else if (phone) {
    user = await prisma.user.findFirst({
      where: { phone },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });
  }

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = sign({
    id: user.id,
    role: user.role,
    email: user.email,
    phone: user.phone,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      mustSetupProfile: user.mustSetupProfile,
      patientId: user.patientProfile
        ? user.patientProfile.id
        : null,
      hasDoctorProfile: !!user.doctorProfile,
    },
    token,
  };
}

/* ----------------------------
   GET CURRENT USER
-----------------------------*/
async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      doctorProfile: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    mustSetupProfile: user.mustSetupProfile,
    patientId: user.patientProfile
      ? user.patientProfile.id
      : null,
    hasDoctorProfile: !!user.doctorProfile,
  };
}

/* ============================================================
   🆕 FORGOT PASSWORD — STEP 1: REQUEST OTP
   ============================================================ */
async function forgotPassword({ email }) {
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const normalized = email.toLowerCase().trim();

  // Look up user by email
  const user = await prisma.user.findFirst({
    where: { email: normalized },
    select: { id: true, email: true, name: true },
  });

  // SECURITY: We always say "OTP sent" even if email doesn't exist,
  // so attackers can't enumerate emails. But we don't actually send
  // if user doesn't exist.
  if (!user) {
    console.log(
      "🔒 Forgot-password attempted for non-existent email:",
      normalized
    );
    return {
      success: true,
      message:
        "If that email is registered, an OTP has been sent.",
    };
  }

  // Generate OTP + send email (throws on rate limit)
  try {
    const { otp } = otpService.createOtp(
      normalized,
      "password_reset"
    );
    await emailService.sendOtpEmail(
      normalized,
      otp,
      "password reset"
    );
  } catch (err) {
    // Rate-limit errors get passed through to user
    if (err.status === 429) {
      throw new ApiError(429, err.message);
    }
    console.error("Forgot-password email error:", err);
    throw new ApiError(
      500,
      "Could not send OTP. Please try again."
    );
  }

  return {
    success: true,
    message:
      "If that email is registered, an OTP has been sent.",
  };
}

/* ============================================================
   🆕 FORGOT PASSWORD — STEP 2: VERIFY OTP
   ============================================================ */
async function verifyOtp({ email, otp }) {
  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const normalized = email.toLowerCase().trim();

  try {
    otpService.verifyOtp(normalized, otp, "password_reset");
  } catch (err) {
    throw new ApiError(
      err.status || 400,
      err.message || "Invalid OTP"
    );
  }

  return {
    success: true,
    message:
      "OTP verified. You may now reset your password.",
  };
}

/* ============================================================
   🆕 FORGOT PASSWORD — STEP 3: RESET PASSWORD
   Requires OTP to have been verified in step 2
   ============================================================ */
async function resetPassword({ email, newPassword }) {
  if (!email || !newPassword) {
    throw new ApiError(
      400,
      "Email and new password are required"
    );
  }

  if (newPassword.length < 8) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters"
    );
  }

  const normalized = email.toLowerCase().trim();

  // Check OTP was verified
  if (!otpService.isVerified(normalized, "password_reset")) {
    throw new ApiError(
      403,
      "OTP not verified. Please verify OTP first."
    );
  }

  const user = await prisma.user.findFirst({
    where: { email: normalized },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      mustChangePassword: false,
    },
  });

  // Consume OTP
  otpService.consumeOtp(normalized);

  return {
    success: true,
    message:
      "Password reset successfully. You may now log in.",
  };
}

module.exports = {
  registerDoctor,
  login,
  me,
  forgotPassword,
  verifyOtp,
  resetPassword,
};