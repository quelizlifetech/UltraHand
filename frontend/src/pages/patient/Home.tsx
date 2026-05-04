import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  TrendingUp,
  Calendar,
  Activity,
  Loader2,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function PatientHome() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatient();
  }, []);

  const loadPatient = async () => {
    try {
      setLoading(true);

      /* FIXED ROUTE */
      const res = await api.get("/patients/me");

      setPatient(res.patient);
    } catch (error) {
      console.error(
        "Failed to load patient data",
        error
      );
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  const sessions =
    patient?.sessions || [];

  const plans =
    patient?.plans || [];

  const latestPlan =
    plans.length > 0
      ? plans[0]
      : null;

  const completedSessions =
    sessions.length;

  const improvementPct =
    useMemo(() => {
      if (!completedSessions)
        return 0;

      return Math.min(
        100,
        completedSessions * 5
      );
    }, [completedSessions]);

  const recoveryStage =
    useMemo(() => {
      if (improvementPct < 30)
        return "Early";

      if (improvementPct < 70)
        return "Progressing";

      return "Advanced";
    }, [improvementPct]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Loading...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Patient data not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          Welcome back
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          {patient.name
            ?.split(" ")[0] ||
            user?.name?.split(" ")[0] ||
            "Patient"}
        </h1>
      </div>

      {/* Today's Therapy */}
      <motion.div
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="clinical-card p-6 gradient-hero"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-primary uppercase tracking-wider">
              Today's therapy
            </div>

            <div className="mt-1 space-y-0.5">
              <div className="text-base font-semibold">
                Mode:{" "}
                {patient
                  ?.therapyConfig
                  ?.therapyMode ||
                  "Active"}
              </div>

              <div className="text-base font-semibold">
                Target:{" "}
                {patient
                  ?.therapyConfig
                  ?.affectedJoints
                  ?.length
                  ? patient.therapyConfig.affectedJoints.join(
                      ", "
                    )
                  : "Hand"}
              </div>
            </div>

            <div className="text-sm text-muted-foreground mt-2">
              {latestPlan
                ?.repetitions || 10}{" "}
              reps ·{" "}
              {patient
                ?.therapyConfig
                ?.durationMinutes ||
                15}{" "}
              min · Target{" "}
              {latestPlan
                ?.targetROM ||
                45}
              °
            </div>
          </div>

          <div className="hidden sm:flex h-14 w-14 rounded-2xl gradient-primary items-center justify-center">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        <Button
          onClick={() =>
            navigate(
              "/patient/session"
            )
          }
          className="mt-5 w-full sm:w-auto gradient-primary"
          disabled={
            !latestPlan?.isFinalized
          }
        >
          <Play className="h-4 w-4 mr-1" />

          {latestPlan?.isFinalized
            ? "Start Session"
            : "Awaiting doctor approval"}
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat
          label="Sessions completed"
          value={String(
            completedSessions
          )}
          icon={Calendar}
        />

        <Stat
          label="Improvement"
          value={`+${improvementPct}%`}
          icon={TrendingUp}
        />

        <Stat
          label="Recovery stage"
          value={recoveryStage}
          icon={Activity}
        />
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="clinical-card p-6">
          <h2 className="font-semibold mb-3">
            Recent sessions
          </h2>

          <div className="space-y-2">
            {sessions
              .slice(0, 3)
              .map(
                (
                  session: any,
                  index: number
                ) => (
                  <div
                    key={
                      session.id
                    }
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                      <Activity className="h-4 w-4" />
                    </div>

                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Session #
                        {sessions.length -
                          index}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {new Date(
                          session.date
                        ).toLocaleDateString()}{" "}
                        · Pain{" "}
                        {
                          session.painLevel
                        }
                        /10
                      </div>
                    </div>
                  </div>
                )
              )}
          </div>
        </div>
      )}
    </div>
  );
}

const Stat = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) => (
  <div className="clinical-card p-5">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    </div>

    <div className="text-2xl font-semibold">
      {value}
    </div>
  </div>
);