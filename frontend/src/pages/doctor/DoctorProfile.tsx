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
  Phone,
  Mail,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  User as UserIcon,
  Lock,
  ArrowLeft,
  Save,
  Pencil,
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

const evaluatePassword = (
  pw: string
): PasswordStrength => {
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
  else if (!/[a-z]/.test(pw))
    hints.push("Add lowercase letter");
  else hints.push("Add a number");

  if (/[^A-Za-z0-9]/.test(pw)) score++;
  else hints.push("Add special character");

  const labels = [
    "Too weak",
    "Weak",
    "Fair",
    "Strong",
    "Very strong",
  ];
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

export default function DoctorProfile() {
  const navigate = useNavigate();
  const updateUser = useAuthStore((s) => s.updateUser);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordSection, setShowPasswordSection] =
    useState(false);

  // Profile fields
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

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── FETCH PROFILE ──────────────────────── */

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/doctor/profile");

      setEmail(res.email || "");

      // Strip +91 prefix if present for display
      const rawPhone = res.phone || "";
      const phoneDigits = rawPhone
        .replace(/^\+91/, "")
        .replace(/\D/g, "");
      setPhone(phoneDigits);

      const p = res.profile;
      if (p) {
        setProfilePhoto(p.profilePhoto || "");
        setUsername(p.username || "");
        setFirstName(p.firstName || "");
        setLastName(p.lastName || "");
        setOccupation(p.occupation || "");
        setClinicName(p.clinicName || "");
        setClinicLocation(p.clinicLocation || "");
        setClinicTimings(p.clinicTimings || "");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  /* ─── VALIDATIONS ────────────────────────── */

  const usernameValid = useMemo(
    () => isValidUsername(username),
    [username]
  );
  const firstNameValid = useMemo(
    () => isValidName(firstName),
    [firstName]
  );
  const lastNameValid = useMemo(
    () => isValidName(lastName),
    [lastName]
  );
  const emailValid = useMemo(
    () => isValidEmail(email),
    [email]
  );
  const phoneValid = useMemo(
    () => isValidPhone(phone),
    [phone]
  );

  const passwordStrength = useMemo(
    () => evaluatePassword(newPassword),
    [newPassword]
  );
  const passwordsMatch =
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword;
  const passwordStrongEnough =
    passwordStrength.score >= 3;

  const profileValid =
    !!profilePhoto &&
    usernameValid &&
    firstNameValid &&
    lastNameValid &&
    emailValid &&
    phoneValid;

  /* ─── PHOTO UPLOAD ───────────────────────── */

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

        const base64 = canvas.toDataURL(
          "image/jpeg",
          0.85
        );
        setProfilePhoto(base64);
        setPhotoLoading(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  /* ─── SAVE PROFILE ───────────────────────── */

  const handleSaveProfile = async () => {
    if (!profileValid) {
      toast.error("Please fix all errors before saving");
      return;
    }

    try {
      setSaving(true);

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

      updateUser({
        hasDoctorProfile: true,
        phone: `+91${phone}`,
      });

      toast.success("Profile updated");
      setEditMode(false);
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  /* ─── CHANGE PASSWORD ────────────────────── */

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Enter current password");
      return;
    }
    if (!passwordStrongEnough) {
      toast.error("New password is too weak");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords don't match");
      return;
    }

    try {
      setSaving(true);
      await api.post("/doctor/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (error: any) {
      toast.error(error.message || "Password change failed");
    } finally {
      setSaving(false);
    }
  };

  /* ─── RENDER ─────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* HEADER */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and update your profile information
          </p>
        </div>

        {!editMode ? (
          <Button
            onClick={() => setEditMode(true)}
            variant="outline"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditMode(false);
                fetchProfile();
              }}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={!profileValid || saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* PHOTO */}
      <section className="clinical-card p-6">
        <h2 className="font-semibold mb-4">
          Profile Photo
        </h2>

        <div className="flex items-center gap-5">
          <div
            className={`relative w-28 h-28 rounded-full overflow-hidden flex items-center justify-center border-2 ${
              profilePhoto
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
          </div>

          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={!editMode}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={!editMode || photoLoading}
            >
              <Camera className="w-4 h-4 mr-2" />
              Change Photo
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              JPG or PNG · Max 5MB
            </p>
          </div>
        </div>
      </section>

      {/* PERSONAL INFO */}
      <section className="clinical-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <UserIcon className="w-4 h-4" />
          Personal Information
        </h2>

        <div>
          <Label>Username</Label>
          <div className="relative">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!editMode}
              className="pr-11"
              maxLength={20}
            />
            {editMode && (
              <FieldStatus
                value={username}
                valid={usernameValid}
              />
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>First Name</Label>
            <div className="relative">
              <Input
                value={firstName}
                onChange={(e) =>
                  setFirstName(e.target.value)
                }
                disabled={!editMode}
                className="pr-11"
              />
              {editMode && (
                <FieldStatus
                  value={firstName}
                  valid={firstNameValid}
                />
              )}
            </div>
          </div>

          <div>
            <Label>Last Name</Label>
            <div className="relative">
              <Input
                value={lastName}
                onChange={(e) =>
                  setLastName(e.target.value)
                }
                disabled={!editMode}
                className="pr-11"
              />
              {editMode && (
                <FieldStatus
                  value={lastName}
                  valid={lastNameValid}
                />
              )}
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
            onChange={(e) =>
              setOccupation(e.target.value)
            }
            disabled={!editMode}
            placeholder="Orthopedic Surgeon"
          />
        </div>

        <div>
          <Label className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            Email
          </Label>
          <div className="relative">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!editMode}
              className="pr-11"
            />
            {editMode && (
              <FieldStatus
                value={email}
                valid={emailValid}
              />
            )}
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            Phone Number
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
                const digits = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
                setPhone(digits);
              }}
              disabled={!editMode}
              className="pl-14 pr-11"
              maxLength={10}
            />
            {editMode && (
              <FieldStatus
                value={phone}
                valid={phoneValid}
              />
            )}
          </div>
        </div>
      </section>

      {/* CLINIC INFO */}
      <section className="clinical-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Clinic / Hospital
        </h2>

        <div>
          <Label>Clinic / Hospital Name</Label>
          <Input
            value={clinicName}
            onChange={(e) =>
              setClinicName(e.target.value)
            }
            disabled={!editMode}
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
              onChange={(e) =>
                setClinicLocation(e.target.value)
              }
              disabled={!editMode}
            />
          </div>

          <div>
            <Label className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Timings
            </Label>
            <Input
              value={clinicTimings}
              onChange={(e) =>
                setClinicTimings(e.target.value)
              }
              disabled={!editMode}
            />
          </div>
        </div>
      </section>

      {/* PASSWORD SECTION */}
      <section className="clinical-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Password
          </h2>
          {!showPasswordSection && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordSection(true)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          )}
        </div>

        {showPasswordSection && (
          <div className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(e.target.value)
                  }
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowCurrent(!showCurrent)
                  }
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
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
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
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  className="pr-11"
                />
                <FieldStatus
                  value={confirmPassword}
                  valid={!!passwordsMatch}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordSection(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={
                  !currentPassword ||
                  !passwordStrongEnough ||
                  !passwordsMatch ||
                  saving
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}