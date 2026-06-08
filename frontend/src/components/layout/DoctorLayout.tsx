import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Bell,
  LogOut,
  AlertTriangle,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const navItems = [
  { to: "/doctor", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/doctor/patients", label: "Patients", icon: Users },
  { to: "/doctor/alerts", label: "Alerts", icon: Bell },
  { to: "/doctor/profile", label: "My Profile", icon: UserIcon },
];

type PatientItem = {
  id: string;
  name: string;
  status: string;
};

export default function DoctorLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string>("");

  useEffect(() => {
    loadPatients();
    loadProfilePhoto();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await api.get("/patients");
      setPatients(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error("Failed to load patients", error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfilePhoto = async () => {
    try {
      const res = await api.get("/doctor/profile");
      if (res.profile?.profilePhoto) {
        setProfilePhoto(res.profile.profilePhoto);
      }
    } catch (error) {
      // Silently fail — profile may not exist yet
      console.warn("Could not load profile photo:", error);
    }
  };

  const alertCount = useMemo(() => {
    return patients.filter(
      (p) =>
        p.status === "Recovering" ||
        p.status === "Critical" ||
        p.status === "Pending"
    ).length;
  }, [patients]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "DR";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Logo />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`
              }
            >
              <item.icon className="h-4 w-4" />

              <span className="flex-1">{item.label}</span>

              {item.to === "/doctor/alerts" && alertCount > 0 && (
                <span className="text-[10px] font-semibold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                  {alertCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer User */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <NavLink
            to="/doctor/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sidebar-accent/60 transition-colors"
          >
            <Avatar className="h-8 w-8">
              {profilePhoto ? (
                <AvatarImage
                  src={profilePhoto}
                  alt={user?.name || "Doctor"}
                />
              ) : null}
              <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.name || "Doctor"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
            </div>
          </NavLink>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b bg-card/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4 md:px-8">
          <div className="md:hidden">
            <Logo />
          </div>

          <div className="hidden md:block text-sm text-muted-foreground">
            Doctor workspace
          </div>

          <div className="flex items-center gap-2">
            {!loading && alertCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-destructive-soft text-destructive font-medium">
                <AlertTriangle className="h-3 w-3" />
                {alertCount} active alerts
              </div>
            )}

            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}