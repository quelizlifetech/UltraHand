import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Sparkles,
  Activity,
  CheckCircle2,
  Pause,
  Play,
  ShieldCheck,
  TrendingUp,
  Clock3,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { toast } from "sonner";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = [
  "#7c3aed",
  "#3b82f6",
  "#10b981",
];

/* =========================================
   NORMALIZE ALL AI REPORT FORMATS
========================================= */

const normalizeReport = (
  report: any
) => {
  if (!report) return null;

  return {
    summary: {
      estimatedDays:
        report?.summary
          ?.estimatedDays ??
        report?.summary
          ?.estimated_days ??
        0,

      recoveryPercent:
        report?.summary
          ?.recoveryPercent ??
        report?.summary
          ?.recovery_percent ??
        0,

      successChance:
        report?.summary
          ?.successChance ??
        report?.summary
          ?.success_chance ??
        0,

      riskLevel:
        report?.summary
          ?.riskLevel ??
        report?.summary
          ?.risk_level ??
        "Unknown",
    },

    recoveryCurve:
      report.recoveryCurve ||
      report.recovery_curve ||
      [],

    daywisePlan:
      report.daywisePlan ||
      report.daywise_plan ||
      [],

    jointAnalysis:
      report.jointAnalysis ||
      report.joint_analysis ||
      [],

    modeDistribution:
      report.modeDistribution ||
      report.mode_distribution ||
      {},
  };
};

export default function PatientDetail() {
  const { id } = useParams();

  const navigate =
    useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [aiLoading, setAiLoading] =
    useState(false);

  const [patient, setPatient] =
    useState<any>(null);

  const [latestPlan, setLatestPlan] =
    useState<any>(null);

  const [aiReport, setAiReport] =
    useState<any>(null);

  const [reps, setReps] =
    useState(10);

  const [target, setTarget] =
    useState(70);

  const [intensity, setIntensity] =
    useState("Moderate");

  /* =========================================
     FETCH PATIENT
  ========================================= */

  const fetchPatient =
    async () => {
      try {
        setLoading(true);

        const res =
          await api.get(
            `/patients/${id}`
          );

        const p =
          res.patient || res;

        setPatient(p);

        if (p?.plans?.length) {
          const plan =
            p.plans[0];

          setLatestPlan(plan);

          setReps(
            plan.repetitions ||
              10
          );

          setTarget(
            plan.targetROM ||
              70
          );

          setIntensity(
            plan.intensity ||
              "Moderate"
          );

          if (plan.aiReport) {
            setAiReport(
              normalizeReport(
                plan.aiReport
              )
            );
          }
        }
      } catch (error: any) {
        toast.error(
          error.message
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchPatient();
  }, [id]);

  /* =========================================
     GENERATE AI PLAN
  ========================================= */

  const generateAIPlan =
    async () => {
      try {
        setAiLoading(true);

        const res =
          await api.post(
            `/plans/generate-ai/${id}`
          );

        const plan =
          res.plan || res;

        setLatestPlan(plan);

        if (plan.aiReport) {
          setAiReport(
            normalizeReport(
              plan.aiReport
            )
          );
        }

        setReps(
          plan.repetitions
        );

        setTarget(
          plan.targetROM
        );

        setIntensity(
          plan.intensity
        );

        toast.success(
          "AI plan generated"
        );

        await fetchPatient();
      } catch (error: any) {
        toast.error(
          error.message
        );
      } finally {
        setAiLoading(false);
      }
    };

  /* =========================================
     SAVE PLAN
  ========================================= */

  const savePlan =
    async () => {
      try {
        await api.post(
          "/plans",
          {
            patientId: id,
            intensity,
            repetitions: reps,
            targetROM: target,
          }
        );

        toast.success(
          "Plan saved"
        );

        fetchPatient();
      } catch (error: any) {
        toast.error(
          error.message
        );
      }
    };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="py-20 text-center">
        Loading...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-20 text-center">
        Patient not found
      </div>
    );
  }

  /* =========================================
     SUMMARY
  ========================================= */

  const summary =
    aiReport?.summary || {};

  /* =========================================
     RECOVERY CURVE
  ========================================= */

  const recoveryCurve =
    (
      aiReport?.recoveryCurve ||
      []
    ).map((item: any) => ({
      day:
        item.day || 0,

      avgROM:
        item.avgROM ??
        item.avg_rom ??
        0,

      recoveryPercent:
        item.recoveryPercent ??
        item.recovery_percent ??
        0,
    }));

  /* =========================================
     RECOVERY LOOKUP
  ========================================= */

  const recoveryByDay =
    Object.fromEntries(
      recoveryCurve.map(
        (item: any) => [
          item.day,
          item.recoveryPercent,
        ]
      )
    );

  /* =========================================
     DAYWISE PLAN
  ========================================= */

  const daywise =
    (
      aiReport?.daywisePlan ||
      []
    ).map((row: any) => ({
      day:
        row.day || 0,

      mode:
        row.mode ||
        row.phase ||
        "Unknown",

      avgROM:
        row.avgROM ??
        row.avg_rom ??
        0,

      recoveryPercent:
        recoveryByDay[
          row.day
        ] || 0,
    }));

  /* =========================================
     JOINT ANALYSIS
  ========================================= */

  const jointData =
    (
      aiReport?.jointAnalysis ||
      []
    ).map((item: any) => ({
      joint:
        item.joint ||
        "Unknown",

      gain:
        item.gain ??
        item.improvement ??
        0,
    }));

  /* =========================================
     MODE DISTRIBUTION
  ========================================= */

  const modeData =
    Object.entries(
      aiReport?.modeDistribution ||
        {}
    ).map(
      ([key, value]) => ({
        name: key,
        value:
          Number(value) ||
          0,
      })
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <button
        onClick={() =>
          navigate(
            "/doctor/patients"
          )
        }
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            {patient.name}
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            {patient.age} yrs ·{" "}
            {patient.handSide} hand
          </p>
        </div>

        <div className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700 h-fit">
          {patient.status}
        </div>
      </div>

      {/* CONTROLS */}

      <section className="clinical-card p-6 space-y-4">
        <h2 className="font-semibold">
          Therapy Plan Control
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>
              Intensity
            </Label>

            <Select
              value={intensity}
              onValueChange={
                setIntensity
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Low">
                  Low
                </SelectItem>

                <SelectItem value="Moderate">
                  Moderate
                </SelectItem>

                <SelectItem value="High">
                  High
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              Repetitions: {reps}
            </Label>

            <Slider
              min={1}
              max={30}
              value={[reps]}
              onValueChange={(
                v
              ) =>
                setReps(v[0])
              }
            />
          </div>

          <div>
            <Label>
              Target ROM:{" "}
              {target}°
            </Label>

            <Slider
              min={10}
              max={100}
              value={[target]}
              onValueChange={(
                v
              ) =>
                setTarget(v[0])
              }
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={
              generateAIPlan
            }
            disabled={aiLoading}
            className="bg-violet-600 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />

            {aiLoading
              ? "Generating..."
              : "Generate AI Plan"}
          </Button>

          <Button
            onClick={savePlan}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save Manual
          </Button>

          <Button variant="outline">
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>

          <Button variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Resume
          </Button>
        </div>
      </section>

      {/* AI REPORT */}

      {aiReport && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Stat
              label="Estimated Days"
              value={String(
                summary.estimatedDays
              )}
              icon={Clock3}
            />

            <Stat
              label="Recovery %"
              value={`${summary.recoveryPercent}%`}
              icon={TrendingUp}
            />

            <Stat
              label="Success Chance"
              value={`${summary.successChance}%`}
              icon={ShieldCheck}
            />

            <Stat
              label="Risk Level"
              value={
                summary.riskLevel
              }
              icon={Activity}
            />
          </div>

          {/* RECOVERY CURVE */}

          <section className="clinical-card p-6">
            <h2 className="font-semibold mb-4">
              Recovery Curve
            </h2>

            <div
              style={{
                width: "100%",
                minWidth: 300,
                height: 400,
              }}
            >
              <ResponsiveContainer
                width="99%"
                height="100%"
              >
                <LineChart
                  data={
                    recoveryCurve
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="day" />

                  <YAxis />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="avgROM"
                    stroke="#3b82f6"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* DAYWISE REPORT */}

          <section className="clinical-card p-6">
            <h2 className="font-semibold mb-4">
              Daywise Therapy
              Report
            </h2>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">
                      Day
                    </th>

                    <th className="text-left py-2">
                      Mode
                    </th>

                    <th className="text-left py-2">
                      ROM
                    </th>

                    <th className="text-left py-2">
                      Recovery %
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {daywise.map(
                    (
                      row: any,
                      idx: number
                    ) => (
                      <tr
                        key={idx}
                        className="border-b"
                      >
                        <td className="py-2">
                          {
                            row.day
                          }
                        </td>

                        <td className="py-2">
                          {
                            row.mode
                          }
                        </td>

                        <td className="py-2">
                          {
                            row.avgROM
                          }
                          °
                        </td>

                        <td className="py-2">
                          {
                            row.recoveryPercent
                          }
                          %
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* JOINT ANALYSIS */}

          <section className="clinical-card p-6">
            <h2 className="font-semibold mb-4">
              Joint Recovery
            </h2>

            <div
              style={{
                width: "100%",
                minWidth: 300,
                height: 400,
              }}
            >
              <ResponsiveContainer
                width="99%"
                height="100%"
              >
                <BarChart
                  data={jointData}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="joint" />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="gain"
                    fill="#7c3aed"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* THERAPY MODE */}

          <section className="clinical-card p-6">
            <h2 className="font-semibold mb-4">
              Therapy Mode
              Distribution
            </h2>

            <div
              style={{
                width: "100%",
                minWidth: 300,
                height: 400,
              }}
            >
              <ResponsiveContainer
                width="99%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={modeData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={
                      120
                    }
                    label
                  >
                    {modeData.map(
                      (
                        _: any,
                        index: number
                      ) => (
                        <Cell
                          key={
                            index
                          }
                          fill={
                            COLORS[
                              index %
                                COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: any) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
          {label}
        </div>

        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="text-xl font-semibold">
        {value}
      </div>
    </div>
  );
}