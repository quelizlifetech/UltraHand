import { Navigate, useLocation } from "react-router-dom";
import { Role } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";

interface RoleGuardProps {
  role: Role;
  children: React.ReactNode;
}

export const RoleGuard = ({
  role,
  children,
}: RoleGuardProps) => {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === "doctor" ? "/doctor" : "/patient"}
        replace
      />
    );
  }

  // 🩺 Doctor must complete profile setup on first login.
  if (
    role === "doctor" &&
    user.mustSetupProfile &&
    !location.pathname.startsWith("/doctor/profile-setup")
  ) {
    return <Navigate to="/doctor/profile-setup" replace />;
  }

  // 🧑‍⚕️ Patient must change default password on first login.
  if (
    role === "patient" &&
    user.mustChangePassword &&
    !location.pathname.startsWith("/patient/profile")
  ) {
    return <Navigate to="/patient/profile" replace />;
  }

  return <>{children}</>;
};