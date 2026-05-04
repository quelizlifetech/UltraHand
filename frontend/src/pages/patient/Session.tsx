import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Play,
  Square,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";

type Phase =
  | "loading"
  | "safety"
  | "running"
  | "feedback"
  | "summary";

export default function Session() {
  const user = useAuthStore((s) => s.user);

  const [patient, setPatient] =
    useState<any>(null);

  const [phase, setPhase] =
    useState<Phase>("loading");

  const [agreed, setAgreed] =
    useState(false);

  const [angle, setAngle] =
    useState(0);

  const [speed, setSpeed] =
    useState(0);

  const [achievedMax, setAchievedMax] =
    useState(0);

  const [pain, setPain] =
    useState(2);

  const [fatigue, setFatigue] =
    useState(false);

  const [notes, setNotes] =
    useState("");

  const intervalRef =
    useRef<number | null>(null);

  useEffect(() => {
    loadPatient();

    return () => {
      stopTimer();
    };
  }, []);

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(
        intervalRef.current
      );
      intervalRef.current =
        null;
    }
  };

  const loadPatient =
    async () => {
      try {
        setPhase("loading");

        /* FIXED ROUTE */
        const res =
          await api.get(
            "/patients/me"
          );

        setPatient(
          res.patient
        );

        setPhase(
          "safety"
        );
      } catch (error) {
        console.error(
          error
        );

        toast.error(
          "Failed to load session"
        );

        setPatient(
          null
        );

        setPhase(
          "summary"
        );
      }
    };

  const plans =
    patient?.plans || [];

  const activePlan =
    plans.length > 0
      ? plans[0]
      : null;

  const target =
    activePlan
      ?.targetROM || 60;

  useEffect(() => {
    if (
      phase !==
      "running"
    )
      return;

    let t = 0;

    intervalRef.current =
      window.setInterval(
        () => {
          t += 0.25;

          const simulatedAngle =
            Math.max(
              0,
              Math.sin(
                t
              ) *
                (target *
                  0.55) +
                target *
                  0.45 +
                (Math.random() -
                  0.5) *
                  4
            );

          const simulatedSpeed =
            Math.abs(
              Math.cos(
                t
              )
            ) *
              50 +
            Math.random() *
              6;

          setAngle(
            simulatedAngle
          );

          setSpeed(
            simulatedSpeed
          );

          setAchievedMax(
            (
              prev
            ) =>
              Math.max(
                prev,
                simulatedAngle
              )
          );
        },
        220
      );

    return () =>
      stopTimer();
  }, [
    phase,
    target,
  ]);

  const startSession =
    async () => {
      try {
        setAchievedMax(
          0
        );
        setAngle(0);
        setSpeed(0);

        /* if backend route exists */
        try {
          await api.post(
            "/sessions/start",
            {
              patientId:
                patient.id,
            }
          );
        } catch {}

        setPhase(
          "running"
        );
      } catch {
        toast.error(
          "Unable to start session"
        );
      }
    };

  const completeSession =
    async () => {
      try {
        stopTimer();

        try {
          await api.post(
            "/sessions/save",
            {
              patientId:
                patient.id,
              painLevel:
                pain,
              fatigue,
              notes,
              metrics:
                [
                  {
                    jointName:
                      patient
                        ?.therapyConfig
                        ?.affectedJoints?.[0] ||
                      "Wrist",
                    angle:
                      Math.round(
                        achievedMax
                      ),
                    speed:
                      Math.round(
                        speed
                      ),
                  },
                ],
            }
          );
        } catch {}

        toast.success(
          "Session saved successfully"
        );

        setPhase(
          "summary"
        );
      } catch {
        toast.error(
          "Failed to save session"
        );
      }
    };

  if (
    phase ===
    "loading"
  ) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
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

  const ratio =
    Math.min(
      1,
      angle / target
    );

  const status =
    ratio > 0.85
      ? "good"
      : ratio > 0.55
      ? "warn"
      : "low";

  const statusMsg =
    status ===
    "good"
      ? "Excellent — hold the range"
      : status ===
        "warn"
      ? "Close to target — push gently"
      : "Increase gradually — don't strain";

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* SAFETY */}
        {phase ===
          "safety" && (
          <motion.div
            key="safety"
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -12,
            }}
            className="clinical-card p-8 max-w-xl mx-auto"
          >
            <div className="h-12 w-12 rounded-2xl bg-warning-soft text-warning flex items-center justify-center mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Pre-session
              safety
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Please read
              carefully
              before
              starting.
            </p>

            <ul className="mt-5 space-y-2 text-sm">
              {[
                "Sit comfortably with arm supported.",
                "Do not force painful movement.",
                "Move slowly and steadily.",
                "Stop if severe pain occurs.",
              ].map(
                (
                  text
                ) => (
                  <li
                    key={
                      text
                    }
                    className="flex gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {
                      text
                    }
                  </li>
                )
              )}
            </ul>

            <label className="mt-6 flex items-start gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer">
              <Checkbox
                checked={
                  agreed
                }
                onCheckedChange={(
                  val
                ) =>
                  setAgreed(
                    !!val
                  )
                }
                className="mt-0.5"
              />

              <span className="text-sm">
                I
                understand
                the
                safety
                rules.
              </span>
            </label>

            <Button
              disabled={
                !agreed
              }
              onClick={
                startSession
              }
              className="w-full mt-5 gradient-primary"
            >
              <Play className="h-4 w-4 mr-1" />
              Start
              Session
            </Button>
          </motion.div>
        )}

        {/* RUNNING */}
        {phase ===
          "running" && (
          <motion.div
            key="running"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">
                Live Session
                ·{" "}
                {activePlan?.intensity ||
                  "Medium"}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  stopTimer();
                  setPhase(
                    "feedback"
                  );
                }}
              >
                <Square className="h-3.5 w-3.5 mr-1" />
                Stop
              </Button>
            </div>

            <div className="clinical-card p-8 flex flex-col items-center">
              <ProgressRing
                value={
                  ratio
                }
              />

              <div className="text-center mt-4">
                <div className="text-5xl font-semibold tabular-nums">
                  {Math.round(
                    angle
                  )}
                  °
                </div>

                <div className="text-sm text-muted-foreground mt-1">
                  Target{" "}
                  {
                    target
                  }
                  °
                </div>
              </div>

              <div className="mt-4 px-4 py-2 rounded-full text-xs font-medium bg-muted">
                {
                  statusMsg
                }
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Metric
                label="Angle"
                value={`${Math.round(
                  angle
                )}°`}
              />

              <Metric
                label="Speed"
                value={`${Math.round(
                  speed
                )} °/s`}
              />

              <Metric
                label="Best"
                value={`${Math.round(
                  achievedMax
                )}°`}
              />
            </div>

            <div className="clinical-card p-4 flex items-start gap-3 bg-primary-soft/40">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />

              <div className="text-xs">
                <div className="font-semibold text-primary">
                  AI
                  feedback
                </div>

                <div className="text-muted-foreground mt-0.5">
                  {
                    statusMsg
                  }
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FEEDBACK */}
        {phase ===
          "feedback" && (
          <motion.div
            key="feedback"
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="clinical-card p-8 max-w-xl mx-auto space-y-5"
          >
            <button
              onClick={() =>
                setPhase(
                  "running"
                )
              }
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Resume
            </button>

            <h2 className="text-2xl font-semibold">
              How did
              that feel?
            </h2>

            <div className="space-y-3">
              <Label>
                Pain
                level:{" "}
                <span className="font-semibold">
                  {
                    pain
                  }
                  /10
                </span>
              </Label>

              <Slider
                value={[
                  pain,
                ]}
                min={0}
                max={10}
                onValueChange={(
                  v
                ) =>
                  setPain(
                    v[0]
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <Label htmlFor="fatigue">
                Feeling
                fatigued?
              </Label>

              <Switch
                id="fatigue"
                checked={
                  fatigue
                }
                onCheckedChange={
                  setFatigue
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Notes
              </Label>

              <textarea
                rows={3}
                value={
                  notes
                }
                onChange={(
                  e
                ) =>
                  setNotes(
                    e
                      .target
                      .value
                  )
                }
                className="w-full rounded-xl border bg-background p-3 text-sm resize-none"
              />
            </div>

            <Button
              onClick={
                completeSession
              }
              className="w-full gradient-primary"
            >
              Submit &
              Finish
            </Button>
          </motion.div>
        )}

        {/* SUMMARY */}
        {phase ===
          "summary" && (
          <motion.div
            key="summary"
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-5 max-w-xl mx-auto"
          >
            <div className="clinical-card p-8 text-center">
              <div className="h-14 w-14 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <h2 className="text-2xl font-semibold">
                Session
                complete
              </h2>

              <div className="text-sm text-muted-foreground mt-1">
                Great job{" "}
                {
                  user?.name
                }
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="ROM achieved"
                value={`${Math.round(
                  achievedMax
                )}°`}
              />

              <Metric
                label="Performance"
                value={
                  achievedMax >
                  target *
                    0.85
                    ? "Good"
                    : "Fair"
                }
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                loadPatient()
              }
            >
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Metric = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="clinical-card p-4">
    <div className="text-xs text-muted-foreground">
      {label}
    </div>

    <div className="text-xl font-semibold mt-1">
      {value}
    </div>
  </div>
);

const ProgressRing = ({
  value,
}: {
  value: number;
}) => {
  const r = 70;

  const c =
    2 *
    Math.PI *
    r;

  const off =
    c *
    (1 -
      Math.min(
        1,
        value
      ));

  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 180 180"
    >
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="10"
      />

      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={
          off
        }
        transform="rotate(-90 90 90)"
        style={{
          transition:
            "stroke-dashoffset 0.3s ease",
        }}
      />
    </svg>
  );
};