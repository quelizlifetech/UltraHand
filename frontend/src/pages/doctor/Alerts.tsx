import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { api } from "@/lib/api";

interface AlertItem {
  patientId: string;
  patientName: string;
  message: string;
}

export default function Alerts() {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [alerts, setAlerts] =
    useState<AlertItem[]>([]);

  /* ---------------------------------- */
  const fetchAlerts = async () => {
    try {
      setLoading(true);

      const res = await api.get(
        "/alerts"
      );

      setAlerts(
        res.alerts || []
      );
    } catch (error) {
      console.error(
        "Failed to load alerts",
        error
      );
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  /* ---------------------------------- */
  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------------------------------- */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Alerts
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          {alerts.length} alert
          {alerts.length !== 1
            ? "s"
            : ""}{" "}
          requiring attention
        </p>
      </div>

      {/* NO ALERTS */}
      {alerts.length ===
      0 ? (
        <div className="clinical-card p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-success-soft text-success flex items-center justify-center mb-3">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="font-semibold">
            All clear
          </div>

          <div className="text-sm text-muted-foreground mt-1">
            No active alerts at
            this time.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(
            (
              alert,
              index
            ) => (
              <button
                key={
                  index
                }
                onClick={() =>
                  navigate(
                    `/doctor/patients/${alert.patientId}`
                  )
                }
                className="w-full clinical-card p-4 flex items-center gap-4 text-left hover:border-destructive/40 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-destructive-soft text-destructive flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {
                      alert.patientName
                    }
                  </div>

                  <div className="text-sm text-muted-foreground truncate">
                    {
                      alert.message
                    }
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}