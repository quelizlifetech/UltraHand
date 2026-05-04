import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Lock,
  Mail,
  User,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

import { authApi } from "@/lib/api";
import { toast } from "sonner";

export default function RegisterDoctor() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const onSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      toast.error(
        "Please fill all fields"
      );
      return;
    }

    if (password.length < 6) {
      toast.error(
        "Password must be at least 6 characters"
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      toast.error(
        "Passwords do not match"
      );
      return;
    }

    try {
      setLoading(true);

      await authApi.registerDoctor({
        name,
        email,
        password,
      });

      toast.success(
        "Doctor account created successfully"
      );

      navigate("/");
    } catch (error: any) {
      toast.error(
        error.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
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
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="hidden lg:block"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-medium mb-6">
              <Activity className="h-3 w-3" />
              Clinical-grade
            </div>

            <h1 className="text-5xl font-semibold tracking-tight leading-[1.05] mb-4">
              Create your
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                doctor workspace.
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Set up your UltraHand
              clinical portal and begin
              managing patient recovery
              safely with AI assistance.
            </p>
          </motion.div>

          {/* Register Card */}
          <motion.div
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
            }}
            className="clinical-card p-8 max-w-md w-full mx-auto"
          >
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">
                Doctor Sign Up
              </h2>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Only doctors/admins can
              create accounts.
            </p>

            <form
              onSubmit={onSubmit}
              className="space-y-4"
            >
              {/* Name */}
              <div className="space-y-2">
                <Label>
                  Full Name
                </Label>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    type="text"
                    placeholder="Dr Mehta"
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email</Label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    type="email"
                    placeholder="doctor@clinic.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label>
                  Password
                </Label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label>
                  Confirm Password
                </Label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={
                      confirmPassword
                    }
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 gradient-primary"
                disabled={loading}
              >
                {loading
                  ? "Creating Account..."
                  : "Create Doctor Account"}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-sm text-muted-foreground mt-6 text-center">
              Already have an
              account?{" "}
              <Link
                to="/"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}