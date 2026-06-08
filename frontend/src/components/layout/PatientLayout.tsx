import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  Pill,
  BarChart3,
  Play,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { api } from "@/lib/api";

const tabs = [
  { to: "/patient", label: "Home", icon: Activity, end: true },
  { to: "/patient/session", label: "Session", icon: Play },
  { to: "/patient/progress", label: "Progress", icon: BarChart3 },
  { to: "/patient/medications", label: "Meds", icon: Pill },
  { to: "/patient/profile", label: "Profile", icon: UserIcon },
];

// Mobile bottom-nav uses fewer tabs to avoid crowding
const mobileTabs = tabs.filter(
  (t) => t.to !== "/patient/profile"
);

export default function PatientLayout() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const navigate = useNavigate();

  const [profilePhoto, setProfilePhoto] = useState<string>("");

  useEffect(() => {
    if (!user) {
      fetchMe();
    }
    loadProfilePhoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfilePhoto = async () => {
    try {
      const res = await api.get("/patients/me");
      if (res.patient?.user?.profilePhoto) {
        setProfilePhoto(res.patient.user.profilePhoto);
      }
    } catch (error) {
      console.warn("Could not load profile photo:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "P";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Logo />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`
              }
            >
              <tab.icon className="h-4 w-4" />
              <span className="flex-1">{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer User */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <NavLink
            to="/patient/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sidebar-accent/60 transition-colors"
          >
            <Avatar className="h-8 w-8">
              {profilePhoto ? (
                <AvatarImage
                  src={profilePhoto}
                  alt={user.name}
                />
              ) : null}
              <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user.name || "Patient"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user.phone || ""}
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
            Patient workspace
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-2 z-30">
        {mobileTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </NavLink>
        ))}

        {/* Profile shortcut on mobile = avatar */}
        <NavLink
          to="/patient/profile"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }
        >
          <Avatar className="h-5 w-5">
            {profilePhoto ? (
              <AvatarImage
                src={profilePhoto}
                alt={user.name}
              />
            ) : null}
            <AvatarFallback className="bg-primary-soft text-primary text-[8px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          Profile
        </NavLink>
      </nav>
    </div>
  );
}