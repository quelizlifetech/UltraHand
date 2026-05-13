import { useEffect, useRef, useState } from "react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

import {
  Loader2,
  TrendingUp,
  ShieldCheck,
  Activity,
  Zap,
  RefreshCw,
} from "lucide-react";

import { api } from "@/lib/api";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
];

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // 30 × 2s = 60s max wait

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [patient, setPatient] = useState<any>(null);

  // useRef so the interval callback always sees fresh values
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  };

  /* ─── helper: fetch once and return patient ─── */
  const fetchPatient = async (): Promise<any> => {
    const res = await api.get("/patients/me");
    return res.patient;
  };

  /* ─── check if the latest plan has a real aiReport ─── */
  const hasAiReport = (pat: any): boolean => {
    const latestPlan = pat?.plans?.[0];
    const curve = latestPlan?.aiReport?.recoveryCurve;
    return Array.isArray(curve) && curve.length > 0;
  };

  /* ─── initial load + start polling if needed ─── */
  const fetchProgress = async () => {
    try {
      setLoading(true);
      const pat = await fetchPatient();
      setPatient(pat);

      if (!hasAiReport(pat)) {
        // Plan exists but aiReport isn't ready yet — start polling
        startPolling();
      }
    } catch (err) {
      console.error("Progress fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    pollCountRef.current = 0;
    setPolling(true);

    intervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        return;
      }

      try {
        const pat = await fetchPatient();
        setPatient(pat);

        if (hasAiReport(pat)) {
          stopPolling(); // ✅ Got the data — stop
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    fetchProgress();
    return () => stopPolling(); // cleanup on unmount
  }, []);

  /* ═══════════════════════════════════════════
     DERIVED DATA — only computed when patient is ready
  ═══════════════════════════════════════════ */

  const latestPlan = patient?.plans?.[0];
  const aiReport = latestPlan?.aiReport || {};

  /* summary */
  const summary = aiReport.summary || {};
  const recoveryPercent = Number(summary.recoveryPercent) || 0;
  const successChance =
    Number(summary.successChance) || Number(summary.recoveryPercent) || 0;
  const estimatedDays = Number(summary.totalDays) || 0;
  const riskLevel = summary.riskLevel || "Unknown";

  /* recovery curve */
  const recoveryCurve = (aiReport.recoveryCurve || []).map((item: any) => ({
    day: Number(item.day) || 0,
    rom: Number(item.avgROM) || 0,
    recovery: Number(item.recoveryPercent) || 0,
  }));

  // FIX: daywisePlan has no recoveryPercent — look it up from recoveryCurve by day
  const recoveryByDay: Record<number, number> = {};
  (aiReport.recoveryCurve || []).forEach((item: any) => {
    recoveryByDay[Number(item.day)] = Number(item.recoveryPercent) || 0;
  });

  /* daywise plan */
  const daywisePlan = (aiReport.daywisePlan || []).map((item: any) => {
    const day = Number(item.day) || 0;
    return {
      day,
      mode: item.phase || "Unknown",
      intensity: item.intensity || "Unknown",
      repetitions: Number(item.repetitions) || 0,
      rom: Number(item.avgROM) || 0,
      recovery: recoveryByDay[day] ?? 0,  // ← pulled from recoveryCurve
    };
  });

  /* joint analysis */
  const jointAnalysis = Object.entries(aiReport.jointSummary || {}).map(
    ([joint, value]: any) => ({
      joint: joint.replaceAll("_", " ").toUpperCase(),
      starting: Number(value.starting_rom) || 0,
      normal: Number(value.normal_rom) || 0,
      deficit: Number(value.deficit) || 0,
    })
  );

  /* mode distribution */
  const modeDistribution = Object.entries(
    aiReport.modeDistribution || {}
  ).map(([key, value]) => ({
    name: key,
    value: Number(value) || 0,
  }));

  const sessions = patient?.sessions || [];

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */

  /* Full-page spinner on first load */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Loading progress...
      </div>
    );
  }

  /* AI report still being generated — show polling state */
  if (!hasAiReport(patient)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-sm font-medium">
          {polling
            ? "Waiting for AI report to be ready…"
            : "No AI report found. Try generating a plan first."}
        </p>
        {polling && (
          <p className="text-xs opacity-60">
            Checking every 2 seconds (attempt {pollCountRef.current}/
            {MAX_POLL_ATTEMPTS})
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* SUMMARY */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Recovery %" value={`${recoveryPercent}%`} />
        <StatCard icon={Zap} label="Success Chance" value={`${successChance}%`} />
        <StatCard icon={Activity} label="Estimated Days" value={estimatedDays} />
        <StatCard icon={ShieldCheck} label="Risk Level" value={riskLevel} />
      </div>

      {/* RECOVERY CURVE */}
      <div className="clinical-card p-6">
        <h2 className="font-semibold mb-4">Recovery Curve</h2>
        <div style={{ width: "100%", height: 400 }}>
          {recoveryCurve.length === 0 ? (
            <EmptyState message="No recovery data available" />
          ) : (
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart
                data={recoveryCurve}
                margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="romGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="rom"
                  stroke="#3b82f6"
                  fill="url(#romGradient)"
                  strokeWidth={3}
                  name="Average ROM"
                />
                <Area
                  type="monotone"
                  dataKey="recovery"
                  stroke="#10b981"
                  fill="#86efac"
                  strokeWidth={3}
                  name="Recovery %"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* DAYWISE REPORT */}
      <div className="clinical-card p-6">
        <h2 className="font-semibold mb-4">Daywise Therapy Report</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Day</th>
                <th className="text-left py-2">Mode</th>
                <th className="text-left py-2">Intensity</th>
                <th className="text-left py-2">Repetitions</th>
                <th className="text-left py-2">ROM</th>
                <th className="text-left py-2">Recovery %</th>
              </tr>
            </thead>
            <tbody>
              {daywisePlan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    No therapy data available
                  </td>
                </tr>
              ) : (
                daywisePlan.map((item: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{item.day}</td>
                    <td className="py-2">{item.mode}</td>
                    <td className="py-2">{item.intensity}</td>
                    <td className="py-2">{item.repetitions}</td>
                    <td className="py-2">{item.rom}°</td>
                    <td className="py-2">{item.recovery}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JOINT ANALYSIS */}
      <div className="clinical-card p-6">
        <h2 className="font-semibold mb-4">Joint Recovery Analysis</h2>
        <div style={{ width: "100%", height: 500 }}>
          {jointAnalysis.length === 0 ? (
            <EmptyState message="No joint analysis available" />
          ) : (
            <ResponsiveContainer width="99%" height="100%">
              <BarChart
                data={jointAnalysis}
                margin={{ top: 20, right: 30, left: 10, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="joint" interval={0} angle={-25} textAnchor="end" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="starting" fill="#3b82f6" name="Starting ROM" />
                <Bar dataKey="normal" fill="#10b981" name="Normal ROM" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* THERAPY MODE DISTRIBUTION */}
      <div className="clinical-card p-6">
        <h2 className="font-semibold mb-4">Therapy Mode Distribution</h2>
        <div style={{ width: "100%", height: 400 }}>
          {modeDistribution.length === 0 ? (
            <EmptyState message="No mode distribution available" />
          ) : (
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Pie
                  data={modeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {modeDistribution.map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SESSION HISTORY */}
      <div className="clinical-card p-6">
        <h2 className="font-semibold mb-4">Session History</h2>
        {sessions.length === 0 ? (
          <div className="text-sm text-center py-10 text-muted-foreground">
            No sessions available
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session: any) => (
              <div key={session.id} className="border rounded-xl p-4">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">
                      {new Date(session.date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pain Level: {session.painLevel}/10
                    </div>
                  </div>
                  <div className="text-sm">
                    Fatigue: {session.fatigue ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Reusable sub-components ─── */

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <div className="clinical-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      {message}
    </div>
  );
}