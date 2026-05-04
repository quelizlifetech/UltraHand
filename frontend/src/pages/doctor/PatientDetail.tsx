import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Activity,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
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

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  const [note, setNote] =
    useState("");

  /* -------------------------------- */
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

        if (
          p?.plans?.length
        ) {
          const plan =
            p.plans[0];

          setLatestPlan(
            plan
          );

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
        }
      } catch (
        error: any
      ) {
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

  /* -------------------------------- */
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

        setLatestPlan(
          plan
        );

        if (
          plan.aiReport
        ) {
          setAiReport(
            plan.aiReport
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
      } catch (
        error: any
      ) {
        toast.error(
          error.message
        );
      } finally {
        setAiLoading(false);
      }
    };

  /* -------------------------------- */
  const savePlan =
    async () => {
      try {
        await api.post(
          "/plans",
          {
            patientId: id,
            intensity,
            repetitions:
              reps,
            targetROM:
              target,
          }
        );

        toast.success(
          "Plan saved"
        );

        fetchPatient();
      } catch (
        error: any
      ) {
        toast.error(
          error.message
        );
      }
    };

  const approvePlan =
    async () => {
      if (
        !latestPlan?.id
      )
        return;

      await api.post(
        `/plans/${latestPlan.id}/approve`
      );

      toast.success(
        "Approved"
      );

      fetchPatient();
    };

  const finalizePlan =
    async () => {
      if (
        !latestPlan?.id
      )
        return;

      await api.post(
        `/plans/${latestPlan.id}/finalize`
      );

      toast.success(
        "Finalized"
      );

      fetchPatient();
    };

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

  const summary =
    aiReport?.summary ||
    {};

  const recoveryCurve =
    aiReport?.recoveryCurve ||
    [];

  const daywise =
    aiReport?.daywisePlan ||
    [];

  const jointData =
    aiReport?.jointAnalysis?.map(
      (j: any) => ({
        name:
          j.joint,
        gain:
          j.gain,
      })
    ) || [];

  const modeData =
    aiReport
      ?.modeDistribution
      ? [
          {
            name:
              "Passive",
            value:
              aiReport
                .modeDistribution
                .passive,
          },
          {
            name:
              "Assistive",
            value:
              aiReport
                .modeDistribution
                .assistive,
          },
          {
            name:
              "Active",
            value:
              aiReport
                .modeDistribution
                .active,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      {/* Header */}
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
            {
              patient.handSide
            }{" "}
            hand
          </p>
        </div>

        <div className="px-3 py-1 rounded-full text-xs bg-success-soft text-success h-fit">
          {
            patient.status
          }
        </div>
      </div>

      {/* Controls */}
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
              value={
                intensity
              }
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
              Repetitions:
              {reps}
            </Label>

            <Slider
              min={1}
              max={30}
              value={[
                reps,
              ]}
              onValueChange={(
                v
              ) =>
                setReps(
                  v[0]
                )
              }
            />
          </div>

          <div>
            <Label>
              Target ROM:
              {target}°
            </Label>

            <Slider
              min={10}
              max={100}
              value={[
                target,
              ]}
              onValueChange={(
                v
              ) =>
                setTarget(
                  v[0]
                )
              }
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={
              generateAIPlan
            }
            disabled={
              aiLoading
            }
            className="bg-violet-600 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {aiLoading
              ? "Generating..."
              : "Generate AI Plan"}
          </Button>

          <Button
            onClick={
              savePlan
            }
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

      {/* Latest Plan */}
      {latestPlan && (
        <section className="clinical-card p-6 border border-violet-500/30">
          <h2 className="font-semibold mb-4">
            Latest Plan
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            <Field
              label="Intensity"
              value={
                latestPlan.intensity
              }
            />
            <Field
              label="Repetitions"
              value={String(
                latestPlan.repetitions
              )}
            />
            <Field
              label="Target ROM"
              value={`${latestPlan.targetROM}°`}
            />
            <Field
              label="Status"
              value={
                latestPlan.isFinalized
                  ? "Finalized"
                  : latestPlan.isApproved
                  ? "Approved"
                  : "Pending"
              }
            />
          </div>

          <div className="flex gap-2 mt-4">
            {!latestPlan.isApproved && (
              <Button
                variant="outline"
                onClick={
                  approvePlan
                }
              >
                Approve
              </Button>
            )}

            {latestPlan.isApproved &&
              !latestPlan.isFinalized && (
                <Button
                  variant="outline"
                  onClick={
                    finalizePlan
                  }
                >
                  Finalize
                </Button>
              )}
          </div>
        </section>
      )}

      {/* AI REPORT */}
      {aiReport && (
        <>
          {/* Summary */}
          <div className="grid md:grid-cols-4 gap-4">
            <Stat
              label="Estimated Days"
              value={String(
                summary.estimatedDays
              )}
              icon={
                Clock3
              }
            />

            <Stat
              label="Recovery %"
              value={`${summary.recoveryPercent}%`}
              icon={
                TrendingUp
              }
            />

            <Stat
              label="Success Chance"
              value={`${summary.successChance}%`}
              icon={
                ShieldCheck
              }
            />

            <Stat
              label="Risk Level"
              value={
                summary.riskLevel
              }
              icon={
                Activity
              }
            />
          </div>

          {/* Curve */}
          <section className="clinical-card p-6">
            <h2 className="font-semibold mb-4">
              Daily Avg ROM Prediction
            </h2>

            <div className="h-72">
              <ResponsiveContainer>
                <LineChart
                  data={
                    recoveryCurve
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="avgROM"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    name="Avg ROM"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Gains */}
          <section className="clinical-card p-6">
            <h2 className="font-semibold mb-4">
              Joint Improvement Prediction
            </h2>

            <div className="h-80">
              <ResponsiveContainer>
                <BarChart
                  data={
                    jointData
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />

                  <Bar
                    dataKey="gain"
                    fill="hsl(var(--primary))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Pie */}
          <section className="clinical-card p-6">
            <h2 className="font-semibold mb-4">
              Therapy Phase Split
            </h2>

            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={
                      modeData
                    }
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {modeData.map(
                      (
                        _: any,
                        i: number
                      ) => (
                        <Cell
                          key={i}
                          fill={`hsl(${220 + i * 60} 70% 55%)`}
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Day Wise Table */}
          <section className="clinical-card p-6">
            <h2 className="font-semibold mb-4">
              Day Wise Therapy Prediction
            </h2>

            <div className="overflow-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      Day
                    </th>
                    <th className="text-left p-2">
                      Phase
                    </th>
                    <th className="text-left p-2">
                      Intensity
                    </th>
                    <th className="text-left p-2">
                      Reps
                    </th>
                    <th className="text-left p-2">
                      Avg ROM
                    </th>
                    <th className="text-left p-2">
                      Wrist Flex
                    </th>
                    <th className="text-left p-2">
                      Wrist Ext
                    </th>
                    <th className="text-left p-2">
                      Index MCP
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {daywise.map(
                    (
                      row: any
                    ) => (
                      <tr
                        key={
                          row.day
                        }
                        className="border-b hover:bg-muted/40"
                      >
                        <td className="p-2">
                          {
                            row.day
                          }
                        </td>
                        <td className="p-2">
                          {
                            row.phase
                          }
                        </td>
                        <td className="p-2">
                          {
                            row.intensity
                          }
                        </td>
                        <td className="p-2">
                          {
                            row.repetitions
                          }
                        </td>
                        <td className="p-2">
                          {
                            row.avgROM
                          }
                          °
                        </td>
                        <td className="p-2">
                          {
                            row.wrist_flexion
                          }
                          °
                        </td>
                        <td className="p-2">
                          {
                            row.wrist_extension
                          }
                          °
                        </td>
                        <td className="p-2">
                          {
                            row.index_mcp
                          }
                          °
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Warning */}
          {aiReport
            ?.warnings
            ?.length >
            0 && (
            <section className="clinical-card p-6 border border-destructive/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h2 className="font-semibold">
                  AI Warnings
                </h2>
              </div>

              <div className="space-y-2 text-sm">
                {aiReport.warnings.map(
                  (
                    w: string,
                    i: number
                  ) => (
                    <div
                      key={
                        i
                      }
                    >
                      •{" "}
                      {
                        w
                      }
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Notes */}
      <section className="clinical-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">
            Notes To Patient
          </h2>
        </div>

        <textarea
          rows={4}
          value={
            note
          }
          onChange={(
            e
          ) =>
            setNote(
              e.target
                .value
            )
          }
          className="w-full rounded-xl border bg-background p-3 text-sm"
          placeholder="Write note..."
        />

        <div className="flex justify-end mt-3">
          <Button>
            Send
          </Button>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------- */
function Field({
  label,
  value,
}: any) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="font-medium mt-1">
        {value}
      </div>
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