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

  // While auth state is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Wrong role trying to access another dashboard
  if (user.role !== role) {
    return (
      <Navigate
        to={
          user.role === "doctor"
            ? "/doctor"
            : "/patient"
        }
        replace
      />
    );
  }

  return <>{children}</>;
};