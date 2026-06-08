import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Lock,
  Mail,
  Phone,
  Stethoscope,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

import { useAuthStore } from "@/store/authStore";
import { Role } from "@/lib/types";

import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("doctor");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const loading = useAuthStore((s) => s.loading);
  const loginDoctor = useAuthStore((s) => s.loginDoctor);
  const loginPatient = useAuthStore((s) => s.loginPatient);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (role === "doctor") {
        if (!email || !password) {
          toast.error("Please enter email and password");
          return;
        }

        await loginDoctor(email, password);
        toast.success("Doctor login successful");
        navigate("/doctor");
      } else {
        if (!phone || !password) {
          toast.error("Please enter phone and password");
          return;
        }

        await loginPatient(phone, password);
        toast.success("Patient login successful");
        navigate("/patient");
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <Logo />
        <ThemeToggle />
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl w-full items-center">
          {/* Left Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:block"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-medium mb-6">
              <Activity className="h-3 w-3" />
              Clinical-grade
            </div>

            <h1 className="text-5xl font-semibold tracking-tight leading-[1.05] mb-4">
              Precision hand therapy,
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                guided by AI.
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Biomechanical data in. Personalized recovery plans out — always
              under clinician control.
            </p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="clinical-card p-8 max-w-md w-full mx-auto"
          >
            <h2 className="text-2xl font-semibold mb-1">Sign in</h2>

            <p className="text-sm text-muted-foreground mb-6">
              Patients are created by their doctor.
            </p>

            {/* Role Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl mb-6">
              {(["doctor", "patient"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    role === r
                      ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "doctor" ? (
                    <Stethoscope className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  {r === "doctor" ? "Doctor / Admin" : "Patient"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Doctor Email */}
              {role === "doctor" && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="doctor@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              )}

              {/* Patient Phone */}
              {role === "patient" && (
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Patient Hint */}
              {role === "patient" && (
                <p className="text-xs text-muted-foreground">
                  Use the mobile number assigned by your doctor. Default
                  password may be provided during onboarding.
                </p>
              )}

              {/* Doctor Signup Link */}
              {role === "doctor" && (
                <div className="text-right text-sm">
                  <Link
                    to="/register-doctor"
                    className="text-primary font-medium hover:underline"
                  >
                    New Doctor? Create Account
                  </Link>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 gradient-primary"
                disabled={loading}
              >
                {loading
                  ? "Signing in..."
                  : role === "doctor"
                  ? "Sign in as Doctor"
                  : "Sign in as Patient"}
              </Button>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}