import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Sparkles,
  Activity,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Clock3,
  Target,
  Flag,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  MapPin,
  Lock,
  Save,
  RotateCcw,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

/* =========================================
   PHASE COLORS
========================================= */

const PHASE_COLORS: Record<
  string,
  {
    solid: string;
    light: string;
    text: string;
    bg: string;
  }
> = {
  "Mechanical Stimulation": {
    solid: "#fb923c",
    light: "#fed7aa",
    text: "text-orange-700",
    bg: "bg-orange-100 text-orange-700",
  },
  Passive: {
    solid: "#3b82f6",
    light: "#bfdbfe",
    text: "text-blue-700",
    bg: "bg-blue-100 text-blue-700",
  },
  Assistive: {
    solid: "#10b981",
    light: "#a7f3d0",
    text: "text-emerald-700",
    bg: "bg-emerald-100 text-emerald-700",
  },
  Active: {
    solid: "#7c3aed",
    light: "#ddd6fe",
    text: "text-violet-700",
    bg: "bg-violet-100 text-violet-700",
  },
};

const PIE_COLORS = [
  "#fb923c",
  "#3b82f6",
  "#10b981",
  "#7c3aed",
];

/* =========================================
   NORMALIZE AI REPORT
========================================= */

const normalizeReport = (
  report: any
) => {
  if (!report) return null;

  const s = report.summary || {};

  return {
    summary: {
      estimatedDays:
        s.estimated_days ??
        s.estimatedDays ??
        s.totalDays ??
        0,
      targetReachedDay:
        s.target_reached_day ??
        s.targetReachedDay ??
        null,
      currentAvgROM:
        s.current_avg_rom ??
        s.currentAvgROM ??
        0,
      targetAvgROM:
        s.target_avg_rom ??
        s.targetAvgROM ??
        0,
      finalAvgROM:
        s.final_avg_rom ??
        s.finalAvgROM ??
        0,
      baselineRecoveryPercent:
        s.baseline_recovery_percent ??
        s.baselineRecoveryPercent ??
        0,
      predictedRecoveryPercent:
        s.predicted_recovery_percent ??
        s.predictedRecoveryPercent ??
        0,
      finalROMPercent:
        s.final_rom_percent ??
        s.finalROMPercent ??
        0,
      successChance:
        s.success_chance ??
        s.successChance ??
        0,
      riskLevel:
        s.risk_level ||
        s.riskLevel ||
        "Unknown",
    },
    recoveryCurve:
      report.recovery_curve ||
      report.recoveryCurve ||
      [],
    daywisePlan:
      report.daywise_plan ||
      report.daywisePlan ||
      [],
    jointAnalysis:
      report.joint_analysis ||
      report.jointAnalysis ||
      [],
    modeDistribution:
      report.mode_distribution ||
      report.modeDistribution ||
      {},
    journey: report.journey || [],
    warnings: report.warnings || [],
  };
};

/* =========================================
   HELPERS
========================================= */

const riskColor = (level: string) => {
  const l = (level || "").toLowerCase();
  if (l === "low")
    return "bg-green-100 text-green-700";
  if (l === "moderate")
    return "bg-amber-100 text-amber-700";
  if (l === "high")
    return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const deviationDisplay = (
  dev: number | null
) => {
  if (dev === null || dev === undefined) {
    return {
      icon: Minus,
      text: "No data yet",
      color: "text-muted-foreground",
    };
  }
  if (dev > 0.5) {
    return {
      icon: TrendingUp,
      text: `+${dev.toFixed(1)}° above predicted`,
      color: "text-green-600",
    };
  }
  if (dev < -0.5) {
    return {
      icon: TrendingDown,
      text: `${dev.toFixed(1)}° below predicted`,
      color: "text-red-600",
    };
  }
  return {
    icon: Minus,
    text: "On track with predicted",
    color: "text-blue-600",
  };
};

const buildPhaseBands = (
  daywise: any[]
) => {
  if (!daywise?.length) return [];
  const bands: any[] = [];
  let currentBand = {
    from: daywise[0].day,
    to: daywise[0].day,
    phase: daywise[0].mode,
  };

  for (let i = 1; i < daywise.length; i++) {
    const row = daywise[i];
    if (row.mode === currentBand.phase) {
      currentBand.to = row.day;
    } else {
      bands.push(currentBand);
      currentBand = {
        from: row.day,
        to: row.day,
        phase: row.mode,
      };
    }
  }
  bands.push(currentBand);
  return bands;
};

const smartTicks = (
  totalDays: number
): number[] => {
  if (totalDays <= 0) return [];
  if (totalDays <= 12) {
    return Array.from(
      { length: totalDays },
      (_, i) => i + 1
    );
  }
  const step = totalDays <= 20 ? 2 : 5;
  const ticks: number[] = [1];
  for (let d = step; d < totalDays; d += step) {
    ticks.push(d);
  }
  if (!ticks.includes(totalDays)) {
    ticks.push(totalDays);
  }
  return ticks;
};

const computeYDomain = (
  minVal: number,
  maxVal: number
): [number, number] => {
  const range = maxVal - minVal;
  const padding = Math.max(
    5,
    Math.ceil(range * 0.15)
  );
  return [
    Math.max(
      0,
      Math.floor((minVal - padding) / 5) * 5
    ),
    Math.ceil((maxVal + padding) / 5) * 5,
  ];
};

const buildStatusSummary = (
  currentDay: number,
  totalDays: number,
  currentPhase: string,
  deviation: number | null,
  completedSessions: number,
  expectedSessions: number
) => {
  if (currentDay <= 1 && completedSessions === 0) {
    return {
      icon: "🟦",
      tone: "neutral",
      text: `Just starting — Day ${currentDay} of ${totalDays}, ${currentPhase} phase`,
    };
  }

  if (deviation === null) {
    return {
      icon: "⚪",
      tone: "neutral",
      text: `${currentPhase} phase · Day ${currentDay} of ${totalDays} · Awaiting first session`,
    };
  }

  if (deviation > 1.5) {
    return {
      icon: "🟢",
      tone: "positive",
      text: `Ahead of schedule by ${deviation.toFixed(
        1
      )}° · ${currentPhase} phase, Day ${currentDay} of ${totalDays}`,
    };
  }

  if (deviation < -1.5) {
    return {
      icon: "🔴",
      tone: "negative",
      text: `Lagging by ${Math.abs(
        deviation
      ).toFixed(
        1
      )}° · ${currentPhase} phase, Day ${currentDay} of ${totalDays} · May need intervention`,
    };
  }

  return {
    icon: "🟢",
    tone: "positive",
    text: `On track · ${currentPhase} phase, Day ${currentDay} of ${totalDays}`,
  };
};

/* =========================================
   PHASE TIMELINE STRIP
========================================= */

function PhaseTimeline({
  phaseBands,
  totalDays,
  currentDay,
}: {
  phaseBands: any[];
  totalDays: number;
  currentDay: number;
}) {
  if (!phaseBands.length || totalDays <= 0)
    return null;

  const pointerPosition = Math.min(
    100,
    Math.max(
      0,
      ((currentDay - 1) /
        Math.max(totalDays - 1, 1)) *
        100
    )
  );

  return (
    <div className="space-y-2">
      <div className="relative h-5">
        <div
          className="absolute -translate-x-1/2 text-[11px] font-medium text-slate-700 whitespace-nowrap flex items-center gap-1"
          style={{
            left: `${pointerPosition}%`,
          }}
        >
          <MapPin className="h-3 w-3 text-slate-600" />
          You are here · Day {currentDay}
        </div>
      </div>

      <div className="relative h-8 rounded-md overflow-hidden flex shadow-sm">
        {phaseBands.map((band, i) => {
          const width =
            ((band.to - band.from + 1) /
              totalDays) *
            100;

          const colors =
            PHASE_COLORS[band.phase];

          return (
            <div
              key={i}
              className="flex items-center justify-center text-[11px] font-medium text-white relative group"
              style={{
                width: `${width}%`,
                backgroundColor:
                  colors?.solid || "#94a3b8",
              }}
              title={`${band.phase} · Days ${band.from}-${band.to}`}
            >
              <span className="px-1 truncate">
                {band.phase}
              </span>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                Days {band.from}-{band.to}
              </div>
            </div>
          );
        })}

        <div
          className="absolute top-0 bottom-0 w-[2px] bg-slate-900"
          style={{
            left: `${pointerPosition}%`,
          }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Day 1</span>
        <span>
          Day {Math.round(totalDays / 2)}
        </span>
        <span>Day {totalDays}</span>
      </div>
    </div>
  );
}

/* =========================================
   COMPONENT
========================================= */

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [latestPlan, setLatestPlan] = useState<any>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [avpData, setAvpData] = useState<any>(null);
  const [avpLoading, setAvpLoading] = useState(false);
  const [reps, setReps] = useState(10);
  const [target, setTarget] = useState(70);
  const [intensity, setIntensity] = useState("Moderate");
  const [tableExpanded, setTableExpanded] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${id}`);
      const p = res.patient || res;
      setPatient(p);

      if (p?.plans?.length) {
        const plan =
          p.plans.find((pl: any) => pl.aiReport) ||
          p.plans[0];
        setLatestPlan(plan);
        setReps(plan.repetitions || 10);
        setTarget(plan.targetROM || 70);
        setIntensity(plan.intensity || "Moderate");
        setHasUnsavedChanges(false);

        if (plan.aiReport) {
          setAiReport(normalizeReport(plan.aiReport));
        }
      } else {
        setLatestPlan(null);
        setAiReport(null);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActualVsPredicted = async () => {
    try {
      setAvpLoading(true);
      const res = await api.get(
        `/sessions/actual-vs-predicted/${id}`
      );
      setAvpData(res);
    } catch (error: any) {
      console.warn(
        "Could not fetch AVP:",
        error.message
      );
      setAvpData(null);
    } finally {
      setAvpLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
    fetchActualVsPredicted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const daywise = useMemo(() => {
    return (aiReport?.daywisePlan || []).map(
      (row: any) => ({
        day: row.day ?? 0,
        mode: row.mode || row.phase || "Unknown",
        intensity: row.intensity || "Moderate",
        repetitions: row.repetitions ?? 0,
        avgROM: Math.round(
          Number(row.rom ?? row.avgROM ?? 0) || 0
        ),
        recoveryPercent: Math.round(
          Number(
            row.recovery ??
              row.recoveryPercent ??
              0
          ) || 0
        ),
      })
    );
  }, [aiReport]);

  const daywiseMap = useMemo(() => {
    const map: Record<number, any> = {};
    daywise.forEach((d: any) => {
      map[d.day] = d;
    });
    return map;
  }, [daywise]);

  const phaseBands = useMemo(
    () => buildPhaseBands(daywise),
    [daywise]
  );

  const modeData = useMemo(() => {
    return Object.entries(
      aiReport?.modeDistribution || {}
    )
      .filter(([, value]) => Number(value) > 0)
      .map(([key, value]) => ({
        name: key,
        value: Number(value) || 0,
      }));
  }, [aiReport]);

  const hasPlan = !!latestPlan;
  const planHasAI = !!latestPlan?.aiReport;
  const isFinalized = !!latestPlan?.isFinalized;

  const canGenerate = !isFinalized;
  const canSave =
    planHasAI && !isFinalized && hasUnsavedChanges;
  const canFinalize =
    planHasAI && !isFinalized && !hasUnsavedChanges;

  const handleIntensityChange = (v: string) => {
    setIntensity(v);
    setHasUnsavedChanges(true);
  };

  const handleRepsChange = (v: number) => {
    setReps(v);
    setHasUnsavedChanges(true);
  };

  const handleTargetChange = (v: number) => {
    setTarget(v);
    setHasUnsavedChanges(true);
  };

  const generateAIPlan = async () => {
    if (isFinalized) return;
    try {
      setAiLoading(true);
      const res = await api.post(
        `/plans/generate-ai/${id}`
      );
      const plan = res.plan || res;
      setLatestPlan(plan);

      if (plan.aiReport) {
        setAiReport(normalizeReport(plan.aiReport));
      }

      setReps(plan.repetitions);
      setTarget(plan.targetROM);
      setIntensity(plan.intensity);
      setHasUnsavedChanges(false);

      toast.success("AI plan generated");
      await fetchPatient();
      await fetchActualVsPredicted();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const savePlan = async () => {
    if (!canSave || !latestPlan?.id) return;
    try {
      setSaveLoading(true);
      await api.put(`/plans/${latestPlan.id}`, {
        intensity,
        repetitions: reps,
        targetROM: target,
      });
      toast.success("Plan saved");
      setHasUnsavedChanges(false);
      await fetchPatient();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const finalizePlan = async () => {
    if (!canFinalize || !latestPlan?.id) return;

    const confirm = window.confirm(
      "Finalize this plan? Once finalized, the plan cannot be edited and the patient can begin sessions."
    );
    if (!confirm) return;

    try {
      setFinalizeLoading(true);
      await api.post(
        `/plans/${latestPlan.id}/finalize`
      );
      toast.success(
        "Plan finalized — patient can now begin sessions"
      );
      await fetchPatient();
      await fetchActualVsPredicted();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setFinalizeLoading(false);
    }
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

  const summary = aiReport?.summary || {};
  const deviation = deviationDisplay(
    avpData?.latestDeviation ?? null
  );
  const DeviationIcon = deviation.icon;

  const chartData = avpData?.data || [];
  const totalDays = avpData?.totalDays || 0;
  const currentDay = avpData?.currentDayInPlan || 1;
  const xTicks = smartTicks(totalDays);

  const allYValues = chartData.flatMap(
    (d: any) =>
      [d.predicted, d.actual].filter(
        (v: any) => v != null
      )
  );
  const targetROM = avpData?.targetROM || 0;
  const minY =
    allYValues.length > 0
      ? Math.min(...allYValues)
      : 0;
  const maxY =
    allYValues.length > 0
      ? Math.max(...allYValues)
      : 0;
  const yDomain = computeYDomain(minY, maxY);

  const visibleDaywise = tableExpanded
    ? daywise
    : daywise.slice(0, 7);

  const currentPhase =
    phaseBands.find(
      (b) =>
        currentDay >= b.from &&
        currentDay <= b.to
    )?.phase || "Unknown";

  const statusSummary = buildStatusSummary(
    currentDay,
    totalDays,
    currentPhase,
    avpData?.latestDeviation ?? null,
    avpData?.completedSessions || 0,
    avpData?.expectedSessionsSoFar || 0
  );

  const statusBg =
    statusSummary.tone === "positive"
      ? "bg-emerald-50 border-emerald-200"
      : statusSummary.tone === "negative"
      ? "bg-red-50 border-red-200"
      : "bg-slate-50 border-slate-200";

  const statusText =
    statusSummary.tone === "positive"
      ? "text-emerald-800"
      : statusSummary.tone === "negative"
      ? "text-red-800"
      : "text-slate-700";

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <button
        onClick={() => navigate("/doctor/patients")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
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
            {patient.handSide} hand ·{" "}
            {patient.diagnosis}
          </p>
        </div>

        <div className="flex items-center gap-2 h-fit">
          {isFinalized && (
            <span className="px-3 py-1 rounded-full text-xs bg-violet-100 text-violet-700 inline-flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Plan Finalized
            </span>
          )}
          <div className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
            {patient.status}
          </div>
        </div>
      </div>

      {/* CONTROLS */}

      <section className="clinical-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Therapy Plan Control
          </h2>
          {isFinalized && (
            <span className="text-xs text-violet-700 inline-flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Locked — finalized plans cannot be edited
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Intensity</Label>
            <Select
              value={intensity}
              onValueChange={handleIntensityChange}
              disabled={isFinalized}
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
              onValueChange={(v) =>
                handleRepsChange(v[0])
              }
              disabled={isFinalized}
            />
          </div>

          <div>
            <Label>
              Target ROM: {target}°
            </Label>
            <Slider
              min={10}
              max={100}
              value={[target]}
              onValueChange={(v) =>
                handleTargetChange(v[0])
              }
              disabled={isFinalized}
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <Button
            onClick={generateAIPlan}
            disabled={!canGenerate || aiLoading}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {aiLoading
              ? "Generating..."
              : planHasAI
              ? "Regenerate AI Plan"
              : "Generate AI Plan"}
          </Button>

          <Button
            onClick={savePlan}
            disabled={!canSave || saveLoading}
            variant={canSave ? "default" : "outline"}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveLoading ? "Saving..." : "Save Changes"}
          </Button>

          <Button
            onClick={finalizePlan}
            disabled={!canFinalize || finalizeLoading}
            className={
              canFinalize
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : ""
            }
            variant={canFinalize ? "default" : "outline"}
          >
            <Lock className="h-4 w-4 mr-2" />
            {finalizeLoading
              ? "Finalizing..."
              : isFinalized
              ? "Finalized"
              : "Finalize Plan"}
          </Button>

          {!planHasAI && (
            <span className="text-xs text-muted-foreground ml-2">
              Generate an AI plan to enable Save / Finalize
            </span>
          )}
          {planHasAI &&
            !isFinalized &&
            hasUnsavedChanges && (
              <span className="text-xs text-amber-600 ml-2 inline-flex items-center gap-1">
                <RotateCcw className="h-3 w-3" />
                Unsaved changes — Save before
                Finalizing
              </span>
            )}
          {planHasAI &&
            !isFinalized &&
            !hasUnsavedChanges && (
              <span className="text-xs text-emerald-600 ml-2">
                Ready to finalize
              </span>
            )}
        </div>
      </section>

      {/* AI REPORT */}

      {aiReport && (
        <>
          {/* PRIMARY STATS */}

          <div className="grid md:grid-cols-4 gap-4">
            <Stat
              label="Estimated Days"
              value={String(summary.estimatedDays)}
              icon={Clock3}
              hint={
                summary.targetReachedDay
                  ? `Target hit day ${summary.targetReachedDay}`
                  : undefined
              }
            />
            <Stat
              label="Predicted Recovery"
              value={`${summary.predictedRecoveryPercent}%`}
              icon={TrendingUp}
              hint="Journey completion"
            />
            <Stat
              label="Success Chance"
              value={`${summary.successChance}%`}
              icon={ShieldCheck}
              hint="Plan confidence"
            />
            <Stat
              label="Risk Level"
              value={summary.riskLevel}
              icon={Activity}
              badgeClass={riskColor(
                summary.riskLevel
              )}
            />
          </div>

          {/* SECONDARY STATS */}

          <div className="grid md:grid-cols-3 gap-4">
            <Stat
              label="Starting ROM"
              value={`${Math.round(
                summary.currentAvgROM
              )}°`}
              icon={Flag}
              hint={`${summary.baselineRecoveryPercent}% of normal`}
            />
            <Stat
              label="Final ROM"
              value={`${Math.round(
                summary.finalAvgROM
              )}°`}
              icon={Target}
              hint={`${summary.finalROMPercent}% of normal`}
            />
            <Stat
              label="Target ROM"
              value={`${Math.round(
                summary.targetAvgROM
              )}°`}
              icon={CheckCircle2}
              hint="Normal range"
            />
          </div>

          {/* PROGRESS TRACKING */}

          {avpData?.hasPlan && (
            <div className="grid md:grid-cols-3 gap-4">
              <Stat
                label="Sessions Completed"
                value={`${avpData.completedSessions} / ${avpData.expectedSessionsSoFar}`}
                icon={CheckCircle2}
                hint={`Day ${avpData.currentDayInPlan} of ${avpData.totalDays}`}
              />
              <Stat
                label="Adherence"
                value={`${avpData.adherencePercent}%`}
                icon={ShieldCheck}
                hint="Of expected sessions"
                badgeClass={
                  avpData.adherencePercent >= 80
                    ? "bg-green-100 text-green-700"
                    : avpData.adherencePercent >= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }
              />
              <Stat
                label="Progress vs Plan"
                value={deviation.text}
                icon={DeviationIcon}
                hint="Latest session vs predicted"
                badgeClass={deviation.color}
              />
            </div>
          )}

          {/* RECOVERY PROGRESS */}

          {avpData?.hasPlan && (
            <section className="clinical-card p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-lg">
                  Recovery Progress
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Where the patient is in
                  their therapy journey
                </p>
              </div>

              <div
                className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${statusBg}`}
              >
                <span className="text-xl leading-none">
                  {statusSummary.icon}
                </span>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${statusText}`}
                  >
                    {statusSummary.text}
                  </p>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                  Therapy Journey
                </div>
                <PhaseTimeline
                  phaseBands={phaseBands}
                  totalDays={totalDays}
                  currentDay={currentDay}
                />
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                  Range of Motion Over Time
                </div>

                <div
                  style={{
                    width: "100%",
                    minWidth: 300,
                    height: 320,
                  }}
                >
                  <ResponsiveContainer
                    width="99%"
                    height="100%"
                  >
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="day"
                        ticks={xTicks}
                        tick={{
                          fontSize: 11,
                          fill: "#64748b",
                        }}
                        label={{
                          value:
                            "Day of Therapy",
                          position:
                            "insideBottom",
                          offset: -10,
                          fontSize: 11,
                          fill: "#64748b",
                        }}
                        stroke="#cbd5e1"
                      />

                      <YAxis
                        domain={yDomain}
                        tick={{
                          fontSize: 11,
                          fill: "#64748b",
                        }}
                        label={{
                          value: "ROM (°)",
                          angle: -90,
                          position: "insideLeft",
                          fontSize: 11,
                          fill: "#64748b",
                          offset: 15,
                        }}
                        stroke="#cbd5e1"
                      />

                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border:
                            "1px solid #e2e8f0",
                        }}
                        formatter={(
                          value: any,
                          name: string
                        ) => {
                          if (
                            value === null ||
                            value === undefined
                          )
                            return ["—", name];
                          return [
                            `${Number(
                              value
                            ).toFixed(1)}°`,
                            name,
                          ];
                        }}
                        labelFormatter={(
                          label: any
                        ) => {
                          const row =
                            daywiseMap?.[
                              Number(label)
                            ];
                          return `Day ${label}${
                            row?.mode
                              ? ` · ${row.mode}`
                              : ""
                          }`;
                        }}
                      />

                      {/* Predicted line — solid blue diagonal */}
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        name="Predicted"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "#3b82f6",
                        }}
                        connectNulls
                      />

                      {/* Actual — green zigzag connected by line */}
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{
                          r: 5,
                          fill: "#10b981",
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{
                          r: 7,
                          fill: "#10b981",
                        }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-5 h-[2.5px] bg-blue-500 rounded" />
                    AI Predicted Path
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-5 h-[2.5px] bg-emerald-500 rounded" />
                    Actual Session Results
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* THERAPY PHASES PIE */}

          <section className="clinical-card p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-semibold">
                  Therapy Phases
                </h2>
                {aiReport.journey?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {aiReport.journey.join(" → ")}
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                minWidth: 300,
                height: 340,
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
                    outerRadius={110}
                    innerRadius={55}
                    paddingAngle={2}
                    label={(entry: any) =>
                      `${entry.value}d`
                    }
                    labelLine={false}
                  >
                    {modeData.map(
                      (
                        entry: any,
                        index: number
                      ) => (
                        <Cell
                          key={index}
                          fill={
                            PHASE_COLORS[
                              entry.name
                            ]?.solid ||
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    formatter={(value: any) =>
                      `${value} days`
                    }
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* DAYWISE TABLE */}

          <section className="clinical-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">
                Daywise Therapy Report
              </h2>
              <span className="text-xs text-muted-foreground">
                {daywise.length} day
                {daywise.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase">
                    <th className="text-left py-2 font-medium">
                      Day
                    </th>
                    <th className="text-left py-2 font-medium">
                      Mode
                    </th>
                    <th className="text-left py-2 font-medium">
                      Intensity
                    </th>
                    <th className="text-left py-2 font-medium">
                      Reps
                    </th>
                    <th className="text-left py-2 font-medium">
                      ROM
                    </th>
                    <th className="text-left py-2 font-medium">
                      Recovery %
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleDaywise.map(
                    (row: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b hover:bg-muted/30 transition"
                      >
                        <td className="py-2 font-medium">
                          {row.day}
                        </td>
                        <td className="py-2">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              PHASE_COLORS[
                                row.mode
                              ]?.bg ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {row.mode}
                          </span>
                        </td>
                        <td className="py-2">
                          {row.intensity}
                        </td>
                        <td className="py-2">
                          {row.repetitions}
                        </td>
                        <td className="py-2">
                          {row.avgROM}°
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{
                                  width: `${row.recoveryPercent}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs">
                              {row.recoveryPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {daywise.length > 7 && (
              <button
                onClick={() =>
                  setTableExpanded(!tableExpanded)
                }
                className="mt-3 w-full text-sm text-violet-600 hover:text-violet-700 flex items-center justify-center gap-1 py-2 border-t"
              >
                {tableExpanded ? (
                  <>
                    Show less
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show all {daywise.length} days
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </section>

          {/* WARNINGS */}

          {aiReport.warnings?.length > 0 && (
            <section className="clinical-card p-6 border-l-4 border-amber-400">
              <h2 className="font-semibold mb-2 text-amber-700">
                Clinical Notes
              </h2>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {aiReport.warnings.map(
                  (w: string, i: number) => (
                    <li
                      key={i}
                      className="flex gap-2"
                    >
                      <span>•</span>
                      <span>{w}</span>
                    </li>
                  )
                )}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* =========================================
   STAT CARD
========================================= */

function Stat({
  label,
  value,
  icon: Icon,
  hint,
  badgeClass,
}: any) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
          {label}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div
        className={
          badgeClass
            ? `inline-block px-2 py-1 rounded text-base font-semibold ${badgeClass}`
            : "text-xl font-semibold"
        }
      >
        {value}
      </div>

      {hint && (
        <div className="text-[10px] text-muted-foreground mt-1">
          {hint}
        </div>
      )}
    </div>
  );
}