import { useEffect, useState } from "react";
import { Pill, Clock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function Medications() {
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<any[]>([]);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setLoading(true);

      const res = await api.get("/patient/me");

      // expecting patient.medications from backend
      setMedications(res?.patient?.medications || []);
    } catch (error) {
      console.error("Failed to load medications", error);
      setMedications([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading medications...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Medications
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Prescribed by your doctor.
        </p>
      </div>

      {/* Empty State */}
      {medications.length === 0 ? (
        <div className="clinical-card p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-3">
            <Pill className="h-5 w-5" />
          </div>

          <div className="font-medium">
            No medications assigned
          </div>

          <div className="text-sm text-muted-foreground mt-1">
            Your doctor has not prescribed any medications yet.
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {medications.map((med: any) => (
            <div
              key={med.id}
              className="clinical-card p-5"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <Pill className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {med.name}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {med.dosage}
                  </div>

                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {med.timing}
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    Duration:{" "}
                    {med.duration || 7} days
                  </div>

                  {med.instructions && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {med.instructions}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}