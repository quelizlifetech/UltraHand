import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Mail,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* =========================================
   VALIDATION
========================================= */

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/* =========================================
   PASSWORD STRENGTH
========================================= */

const evaluatePassword = (pw: string) => {
  if (!pw) {
    return {
      score: 0,
      label: "",
      color: "bg-muted",
      hints: [] as string[],
    };
  }

  let score = 0;
  const hints: string[] = [];

  if (pw.length >= 8) score++;
  else hints.push("At least 8 characters");

  if (/[A-Z]/.test(pw)) score++;
  else hints.push("Add uppercase letter");

  if (/[a-z]/.test(pw) && /\d/.test(pw)) score++;
  else if (!/[a-z]/.test(pw)) hints.push("Add lowercase letter");
  else hints.push("Add a number");

  if (/[^A-Za-z0-9]/.test(pw)) score++;
  else hints.push("Add special character");

  const labels = ["Too weak", "Weak", "Fair", "Strong", "Very strong"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];

  return {
    score,
    label: labels[score],
    color: colors[score],
    hints,
  };
};

/* =========================================
   STAGE BREADCRUMBS
========================================= */

function StageIndicator({ stage }: { stage: 1 | 2 | 3 }) {
  const stages = [
    { num: 1, label: "Email" },
    { num: 2, label: "Verify" },
    { num: 3, label: "Reset" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {stages.map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all ${
              stage > s.num
                ? "bg-emerald-500 text-white"
                : stage === s.num
                ? "bg-violet-600 text-white ring-4 ring-violet-500/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {stage > s.num ? (
              <Check className="w-4 h-4" strokeWidth={3} />
            ) : (
              s.num
            )}
          </div>
          <span
            className={`text-xs font-medium ${
              stage >= s.num
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < stages.length - 1 && (
            <div
              className={`w-8 h-[2px] mx-1 ${
                stage > s.num ? "bg-emerald-500" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================
   OTP INPUT — 6 separate boxes
========================================= */

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const setDigit = (idx: number, d: string) => {
    const clean = d.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[idx] = clean || " ";
    const newVal = arr.join("").trimEnd();
    onChange(newVal);

    if (clean && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKey = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      const arr = value.padEnd(6, " ").split("");
      if (arr[idx] === " " && idx > 0) {
        inputsRef.current[idx - 1]?.focus();
      } else {
        arr[idx] = " ";
        onChange(arr.join("").trimEnd());
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted) {
      onChange(pasted);
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-14 text-center text-xl font-semibold rounded-xl border-2 border-border bg-background text-foreground focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/20 transition-all disabled:bg-muted disabled:text-muted-foreground"
        />
      ))}
    </div>
  );
}

/* =========================================
   COMPONENT
========================================= */

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNew, setShowNew] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const otpValid = otp.length === 6;
  const passwordStrength = useMemo(
    () => evaluatePassword(newPassword),
    [newPassword]
  );
  const passwordsMatch =
    newPassword && newPassword === confirmPassword;
  const passwordStrongEnough = passwordStrength.score >= 3;

  const handleRequestOtp = async () => {
    if (!emailValid) {
      toast.error("Please enter a valid email");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/forgot-password", { email });
      toast.success("OTP sent — check your email");
      setStage(2);
      setResendCooldown(60);
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      await api.post("/auth/forgot-password", { email });
      toast.success("New OTP sent");
      setOtp("");
      setResendCooldown(60);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValid) {
      toast.error("Enter the 6-digit code");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/verify-otp", { email, otp });
      toast.success("OTP verified");
      setStage(3);
    } catch (error: any) {
      toast.error(error.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordStrongEnough) {
      toast.error("Password is too weak");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords don't match");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/reset-password", {
        email,
        newPassword,
      });
      toast.success("Password reset successfully!");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-4">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            We'll guide you through 3 quick steps
          </p>
        </div>

        {/* STAGES */}
        <StageIndicator stage={stage} />

        {/* CARD */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
          {/* ─────── STAGE 1: EMAIL ─────── */}
          {stage === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-lg">
                  Enter your email
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll send a 6-digit code to your email
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email Address
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    emailValid &&
                    handleRequestOtp()
                  }
                />
              </div>

              <Button
                onClick={handleRequestOtp}
                disabled={!emailValid || loading}
                className="w-full h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </div>
          )}

          {/* ─────── STAGE 2: VERIFY OTP ─────── */}
          {stage === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-lg">
                  Enter verification code
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">
                    {email}
                  </span>
                </p>
              </div>

              <OtpInput
                value={otp}
                onChange={setOtp}
                disabled={loading}
              />

              <Button
                onClick={handleVerifyOtp}
                disabled={!otpValid || loading}
                className="w-full h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Verify Code
                  </>
                )}
              </Button>

              {/* Resend */}
              <div className="text-center">
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 disabled:text-muted-foreground disabled:no-underline hover:underline"
                >
                  {resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : "Didn't get it? Resend code"}
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    setStage(1);
                    setOtp("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Use a different email
                </button>
              </div>
            </div>
          )}

          {/* ─────── STAGE 3: RESET PASSWORD ─────── */}
          {stage === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-lg">
                  Set a new password
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a strong password you'll remember
                </p>
              </div>

              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="Enter new password"
                    className="pr-11"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i <= passwordStrength.score
                              ? passwordStrength.color
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={
                          passwordStrength.score >= 3
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-amber-600 dark:text-amber-400 font-medium"
                        }
                      >
                        {passwordStrength.label}
                      </span>
                      {passwordStrength.hints.length > 0 && (
                        <span className="text-muted-foreground">
                          💡 {passwordStrength.hints[0]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Re-enter new password"
                    className="pr-11"
                  />
                  {confirmPassword && (
                    <span
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                        passwordsMatch
                          ? "text-emerald-500"
                          : "text-red-500"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-5 h-5 rounded-full ${
                          passwordsMatch
                            ? "bg-emerald-500/10"
                            : "bg-red-500/10"
                        }`}
                      >
                        {passwordsMatch ? (
                          <Check
                            className="w-3 h-3"
                            strokeWidth={3}
                          />
                        ) : (
                          <X
                            className="w-3 h-3"
                            strokeWidth={3}
                          />
                        )}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <Button
                onClick={handleResetPassword}
                disabled={
                  !passwordStrongEnough ||
                  !passwordsMatch ||
                  loading
                }
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* BACK TO LOGIN */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}