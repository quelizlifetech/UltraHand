/* ============================================================
   OTP SERVICE — In-Memory Store
   ────────────────────────────────────────────────────────────
   Stores OTPs in a Map keyed by email.
   Each entry has: { otp, createdAt, attempts, purpose }
   Auto-expires after OTP_EXPIRY_MS.
   ============================================================ */

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3;

// Active OTPs: Map<email, { otp, createdAt, attempts, purpose }>
const otpStore = new Map();

// Request rate tracking: Map<email, [timestamp, timestamp, ...]>
const requestLog = new Map();

/* ----------------------------------------------------------
   HELPERS
---------------------------------------------------------- */
function generateOtp() {
  // 6-digit OTP, zero-padded
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanupExpired() {
  const now = Date.now();
  for (const [email, entry] of otpStore.entries()) {
    if (now - entry.createdAt > OTP_EXPIRY_MS) {
      otpStore.delete(email);
    }
  }
}

function pruneOldRequests(email) {
  const now = Date.now();
  const arr = requestLog.get(email) || [];
  const recent = arr.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length === 0) {
    requestLog.delete(email);
  } else {
    requestLog.set(email, recent);
  }
  return recent;
}

/* ----------------------------------------------------------
   CREATE OTP — issues a new OTP for an email
   Returns: { otp, expiresInSec }
   Throws if rate limit exceeded.
---------------------------------------------------------- */
function createOtp(email, purpose = "password_reset") {
  const normalizedEmail = email.toLowerCase().trim();

  // Cleanup expired entries opportunistically
  cleanupExpired();

  // Rate limit check
  const recent = pruneOldRequests(normalizedEmail);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = Math.min(...recent);
    const waitMin = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (Date.now() - oldest)) /
        60000
    );
    const err = new Error(
      `Too many OTP requests. Try again in ${waitMin} minute(s).`
    );
    err.status = 429;
    throw err;
  }

  // Generate + store
  const otp = generateOtp();
  otpStore.set(normalizedEmail, {
    otp,
    createdAt: Date.now(),
    attempts: 0,
    purpose,
  });

  // Log the request
  recent.push(Date.now());
  requestLog.set(normalizedEmail, recent);

  return {
    otp,
    expiresInSec: OTP_EXPIRY_MS / 1000,
  };
}

/* ----------------------------------------------------------
   VERIFY OTP — checks if provided OTP matches stored one
   Returns: true (valid) or throws on failure
---------------------------------------------------------- */
function verifyOtp(email, providedOtp, purpose = "password_reset") {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = otpStore.get(normalizedEmail);

  if (!entry) {
    const err = new Error(
      "OTP not found or expired. Please request a new one."
    );
    err.status = 400;
    throw err;
  }

  // Expiry check
  if (Date.now() - entry.createdAt > OTP_EXPIRY_MS) {
    otpStore.delete(normalizedEmail);
    const err = new Error(
      "OTP expired. Please request a new one."
    );
    err.status = 400;
    throw err;
  }

  // Purpose match
  if (entry.purpose !== purpose) {
    const err = new Error("OTP purpose mismatch.");
    err.status = 400;
    throw err;
  }

  // Attempt count
  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    otpStore.delete(normalizedEmail);
    const err = new Error(
      "Too many incorrect attempts. Please request a new OTP."
    );
    err.status = 429;
    throw err;
  }

  // Code match (constant time-ish — both are short strings)
  if (entry.otp !== String(providedOtp).trim()) {
    const remaining = MAX_ATTEMPTS - entry.attempts;
    const err = new Error(
      `Incorrect OTP. ${remaining} attempt(s) remaining.`
    );
    err.status = 400;
    throw err;
  }

  // Success — don't delete yet, mark as verified
  // (we delete on actual password reset)
  entry.verified = true;
  return true;
}

/* ----------------------------------------------------------
   CHECK IF OTP WAS VERIFIED — used before allowing reset
---------------------------------------------------------- */
function isVerified(email, purpose = "password_reset") {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = otpStore.get(normalizedEmail);
  if (!entry) return false;
  if (Date.now() - entry.createdAt > OTP_EXPIRY_MS) {
    otpStore.delete(normalizedEmail);
    return false;
  }
  return entry.verified && entry.purpose === purpose;
}

/* ----------------------------------------------------------
   CONSUME OTP — invalidates after successful use
---------------------------------------------------------- */
function consumeOtp(email) {
  const normalizedEmail = email.toLowerCase().trim();
  otpStore.delete(normalizedEmail);
}

module.exports = {
  createOtp,
  verifyOtp,
  isVerified,
  consumeOtp,
};