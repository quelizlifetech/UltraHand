import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Activity,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function DoctorOverview() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      const res = await api.get("/patients");
      setPatients(res.patients || res);
    } catch (error) {
      console.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  }

  /* -----------------------------------
     Dynamic Greeting
  ----------------------------------- */
  const hour = new Date().getHours();

  let greeting = "Good morning";

  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17) {
    greeting = "Good evening";
  }

  const doctorName =
    user?.name?.replace(/^Dr\.?\s*/i, "") || "Doctor";

  /* -----------------------------------
     Stats
  ----------------------------------- */
  const total = patients.length;

  const active = patients.filter(
    (p) => p.status === "Active"
  ).length;

  const alerts = patients.flatMap((p) =>
    (p.alerts || []).map((msg: string) => ({
      patient: p,
      msg,
    }))
  );

  const cards = [
    {
      label: "Total Patients",
      value: total,
      icon: Users,
      to: "/doctor/patients",
    },
    {
      label: "Active Patients",
      value: active,
      icon: Activity,
      to: "/doctor/patients",
    },
    {
      label: "Critical Alerts",
      value: alerts.length,
      icon: AlertTriangle,
      to: "/doctor/alerts",
    },
  ];

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting}, {doctorName}
        </h1>

        <p className="text-muted-foreground mt-1">
          Here's your clinic at a glance.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <motion.button
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(c.to)}
            className="stat-card text-left group"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground font-medium">
                  {c.label}
                </div>

                <div className="text-4xl font-semibold mt-2 tracking-tight">
                  {c.value}
                </div>
              </div>

              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-muted">
                <c.icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              View details
              <ArrowRight className="h-3 w-3" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Patients */}
        <div className="lg:col-span-2 clinical-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              Recent patients
            </h2>

            <button
              onClick={() =>
                navigate("/doctor/patients")
              }
              className="text-xs text-primary font-medium hover:underline"
            >
              View all
            </button>
          </div>

          <div className="space-y-2">
            {patients.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  navigate(
                    `/doctor/patients/${p.id}`
                  )
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-semibold">
                  {p.name
                    ?.split(" ")
                    .map(
                      (n: string) => n[0]
                    )
                    .join("")}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.name}
                  </div>

                  <div className="text-xs text-muted-foreground truncate">
                    {p.diagnosis}
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted">
                  {p.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="clinical-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold">
              Alerts
            </h2>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              All clear. No active alerts.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts
                .slice(0, 5)
                .map((a, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      navigate(
                        `/doctor/patients/${a.patient.id}`
                      )
                    }
                    className="w-full text-left p-3 rounded-xl bg-destructive-soft/50 hover:bg-destructive-soft transition-colors"
                  >
                    <div className="text-xs font-semibold text-destructive">
                      {a.patient.name}
                    </div>

                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.msg}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}