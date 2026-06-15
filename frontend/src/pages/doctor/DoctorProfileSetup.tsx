import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Camera,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Phone,
  Mail,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  User as UserIcon,
  Lock,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* =========================================
   VALIDATION HELPERS
========================================= */

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const isValidPhone = (v: string) =>
  /^\d{10}$/.test(v.trim());

const isValidUsername = (v: string) =>
  /^[a-zA-Z0-9_]{3,20}$/.test(v.trim());

const isValidName = (v: string) =>
  /^[a-zA-Z\s]{2,30}$/.test(v.trim());

/* =========================================
   PASSWORD STRENGTH
========================================= */

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  hints: string[];
}

const evaluatePassword = (pw: string): PasswordStrength => {
  if (!pw) {
    return {
      score: 0,
      label: "",
      color: "bg-slate-200",
      hints: [],
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
  else hints.push("Add special character (!@#$...)");

  const labels = ["Too weak", "Weak", "Fair", "Strong", "Very strong"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];

  return {
    score: score as PasswordStrength["score"],
    label: labels[score],
    color: colors[score],
    hints,
  };
};

/* =========================================
   FIELD STATUS ICON
========================================= */

function FieldStatus({
  value,
  valid,
}: {
  value: string;
  valid: boolean;
}) {
  if (!value) return null;
  return (
    <span
      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${
        valid ? "text-emerald-500" : "text-red-500"
      }`}
    >
      <span
        className={`flex items-center justify-center w-5 h-5 rounded-full ${
          valid ? "bg-emerald-100" : "bg-red-100"
        }`}
      >
        {valid ? (
          <Check className="w-3 h-3" strokeWidth={3} />
        ) : (
          <X className="w-3 h-3" strokeWidth={3} />
        )}
      </span>
    </span>
  );
}

/* =========================================
   COMPONENT
========================================= */

export default function DoctorProfileSetup() {
  const navigate = useNavigate();
  const updateUser = useAuthStore((s) => s.updateUser);

  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [profilePhoto, setProfilePhoto] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicLocation, setClinicLocation] = useState("");
  const [clinicTimings, setClinicTimings] = useState("");

  // 🆕 Password change is now OPTIONAL
  // Doctor can either skip these or fill all 3 to change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (user?.email) setEmail(user.email);
    if (user?.phone) {
      const digits = user.phone.replace(/^\+91/, "").replace(/\D/g, "");
      setPhone(digits);
    }
  }, []);

  /* VALIDATIONS */
  const usernameValid = useMemo(() => isValidUsername(username), [username]);
  const firstNameValid = useMemo(() => isValidName(firstName), [firstName]);
  const lastNameValid = useMemo(() => isValidName(lastName), [lastName]);
  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const phoneValid = useMemo(() => isValidPhone(phone), [phone]);

  const passwordStrength = useMemo(
    () => evaluatePassword(newPassword),
    [newPassword]
  );
  const passwordsMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordStrongEnough = passwordStrength.score >= 3;

  const photoValid = !!profilePhoto;

  const profileValid =
    photoValid &&
    usernameValid &&
    firstNameValid &&
    lastNameValid &&
    emailValid &&
    phoneValid;

  // 🆕 Password section is "in progress" if user has typed in ANY password field
  const passwordTouched =
    !!currentPassword || !!newPassword || !!confirmPassword;

  // 🆕 If user is changing password, all 3 fields must be valid
  const passwordValid =
    currentPassword.length > 0 &&
    passwordStrongEnough &&
    passwordsMatch;

  // 🆕 Form valid if profile is valid AND
  // either password is untouched (skip) OR all 3 password fields are valid (change)
  const allValid = profileValid && (!passwordTouched || passwordValid);

  /* PHOTO UPLOAD + RESIZE */
  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 300;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", 0.85);
        setProfilePhoto(base64);
        setPhotoLoading(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  /* SUBMIT */
  const handleSubmit = async () => {
    if (!allValid) {
      toast.error("Please fix all errors before submitting");
      return;
    }

    try {
      setLoading(true);

      // 🆕 Only call change-password API if doctor filled the password fields
      if (passwordTouched && passwordValid) {
        await api.post("/doctor/change-password", {
          currentPassword,
          newPassword,
        });
      }

      await api.post("/doctor/profile", {
        username,
        firstName,
        lastName,
        occupation,
        profilePhoto,
        clinicName,
        clinicLocation,
        clinicTimings,
        phone: `+91${phone}`,
      });

      toast.success("Profile setup complete!");

      updateUser({
        mustSetupProfile: false,
        mustChangePassword: false,
        hasDoctorProfile: true,
        phone: `+91${phone}`,
      });

      navigate("/doctor");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome to UltraHand
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Please complete your profile to get started. All fields marked
            with <span className="text-red-500">*</span> are required.
          </p>
        </div>

        {/* PHOTO UPLOAD */}
        <section className="clinical-card p-6 mb-6">
          <h2 className="font-semibold mb-4">
            Profile Photo <span className="text-red-500">*</span>
          </h2>

          <div className="flex items-center gap-5">
            <div
              className={`relative w-28 h-28 rounded-full overflow-hidden flex items-center justify-center border-2 transition-all ${
                photoValid
                  ? "border-emerald-400 ring-4 ring-emerald-50"
                  : "border-dashed border-slate-300 bg-slate-50"
              }`}
            >
              {photoLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-8 h-8 text-slate-400" />
              )}

              {photoValid && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white">
                  <Check className="w-4 h-4" strokeWidth={3} />
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <Button
                type="button"
                variant={photoValid ? "outline" : "default"}
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
              >
                <Camera className="w-4 h-4 mr-2" />
                {profilePhoto ? "Change Photo" : "Upload Photo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                JPG or PNG · Max 5MB · Auto-resized
              </p>
            </div>
          </div>
        </section>

        {/* PERSONAL INFO */}
        <section className="clinical-card p-6 mb-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Personal Information
          </h2>

          <div>
            <Label>
              Username <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="dr_swapnil"
                className="pr-11"
                maxLength={20}
              />
              <FieldStatus value={username} valid={usernameValid} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              3-20 chars. Letters, numbers, underscore only.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>
                First Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Swapnil"
                  className="pr-11"
                />
                <FieldStatus value={firstName} valid={firstNameValid} />
              </div>
            </div>

            <div>
              <Label>
                Last Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Bhansali"
                  className="pr-11"
                />
                <FieldStatus value={lastName} valid={lastNameValid} />
              </div>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              Occupation
            </Label>
            <Input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Orthopedic Surgeon"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr@example.com"
                className="pr-11"
              />
              <FieldStatus value={email} valid={emailValid} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Email verification will be added later
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none border-r border-slate-200 pr-2">
                +91
              </span>
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(digits);
                }}
                placeholder="9876543210"
                className="pl-14 pr-11"
                maxLength={10}
              />
              <FieldStatus value={phone} valid={phoneValid} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              10-digit Indian mobile · OTP verification will be added later
            </p>
          </div>
        </section>

        {/* CLINIC INFO */}
        <section className="clinical-card p-6 mb-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Clinic / Hospital
          </h2>

          <div>
            <Label>Clinic / Hospital Name</Label>
            <Input
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="UltraHand Rehab Center"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </Label>
              <Input
                value={clinicLocation}
                onChange={(e) => setClinicLocation(e.target.value)}
                placeholder="Mumbai, India"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Timings
              </Label>
              <Input
                value={clinicTimings}
                onChange={(e) => setClinicTimings(e.target.value)}
                placeholder="Mon–Sat · 10AM–6PM"
              />
            </div>
          </div>
        </section>

        {/* PASSWORD CHANGE — NOW OPTIONAL */}
        <section className="clinical-card p-6 mb-6 space-y-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
              <span className="text-xs font-normal text-muted-foreground ml-1">
                (Optional)
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to keep your current password. Fill all 3 fields to set a new one.
            </p>
          </div>

          <div>
            <Label>Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-11"
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
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={
                      passwordStrength.score >= 3
                        ? "text-emerald-600 font-medium"
                        : "text-amber-600 font-medium"
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
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="pr-11"
              />
              <FieldStatus
                value={confirmPassword}
                valid={!!passwordsMatch}
              />
            </div>
          </div>
        </section>

        {/* SUBMIT */}
        <div className="sticky bottom-4">
          <Button
            onClick={handleSubmit}
            disabled={!allValid || loading}
            className={`w-full h-12 text-base ${
              allValid
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : ""
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : allValid ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete Setup
              </>
            ) : (
              "Fill all required fields"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}