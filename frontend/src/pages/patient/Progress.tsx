import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2, TrendingUp, Activity, AlertCircle } from "lucide-react";

import { api } from "@/lib/api";

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);

      const res = await api.get("/patient/me");
      setPatient(res.patient);
    } catch (error) {
      console.error("Failed to load progress", error);
    } finally {
      setLoading(false);
    }
  };

  const sessions = patient?.sessions || [];

  const chartData = useMemo(() => {
    return sessions.map((session: any, index: number) => {
      const metric = session.metrics?.[0];

      return {
        day: `S${index + 1}`,
        rom: metric?.angle || 0,
        pain: session.painLevel || 0,
      };
    });
  }, [sessions]);

  const avgROM = useMemo(() => {
    if (!chartData.length) return 0;

    const total = chartData.reduce(
      (sum: number, item: any) => sum + item.rom,
      0
    );

    return Math.round(total / chartData.length);
  }, [chartData]);

  const avgPain = useMemo(() => {
    if (!chartData.length) return 0;

    const total = chartData.reduce(
      (sum: number, item: any) => sum + item.pain,
      0
    );

    return (total / chartData.length).toFixed(1);
  }, [chartData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Loading progress...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your Progress
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Recovery trends based on real therapy sessions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat
          icon={Activity}
          label="Sessions"
          value={String(sessions.length)}
        />

        <Stat
          icon={TrendingUp}
          label="Avg ROM"
          value={`${avgROM}°`}
        />

        <Stat
          icon={AlertCircle}
          label="Avg Pain"
          value={`${avgPain}/10`}
        />
      </div>

      {/* ROM Chart */}
      <div className="clinical-card p-6">
        <h2 className="font-semibold mb-4">
          Range of Motion
        </h2>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 8,
                right: 8,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />

              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />

              <YAxis
                unit="°"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />

              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border:
                    "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />

              <Legend wrapperStyle={{ fontSize: 11 }} />

              <Line
                type="monotone"
                dataKey="rom"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                name="ROM (°)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pain Chart */}
      <div className="clinical-card p-6">
        <h2 className="font-semibold mb-4">
          Pain Trend
        </h2>

        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 8,
                right: 8,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />

              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />

              <YAxis
                domain={[0, 10]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />

              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border:
                    "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />

              <Line
                type="monotone"
                dataKey="pain"
                stroke="hsl(var(--warning))"
                strokeWidth={3}
                name="Pain"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Session History */}
      <div className="clinical-card p-6">
        <h2 className="font-semibold mb-4">
          Session History
        </h2>

        {sessions.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            No sessions completed yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions
              .slice()
              .reverse()
              .map((session: any) => {
                const metric =
                  session.metrics?.[0];

                return (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl bg-muted/40 flex items-center gap-4"
                  >
                    <div className="text-xs text-muted-foreground w-24">
                      {new Date(
                        session.date
                      ).toLocaleDateString()}
                    </div>

                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {metric?.angle || 0}° ROM
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Pain {session.painLevel}/10{" "}
                        {session.fatigue
                          ? "· Fatigued"
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: any) {
  return (
    <div className="clinical-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
          {label}
        </div>

        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="text-2xl font-semibold">
        {value}
      </div>
    </div>
  );
}