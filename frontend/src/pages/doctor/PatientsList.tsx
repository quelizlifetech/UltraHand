import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Trash2, Edit, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  diagnosis: string;
  category: string;
  handSide: string;
  status: string;
  createdAt: string;
}

export default function PatientsList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const filter = params.get("filter");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const fetchPatients = async () => {
    try {
      setLoading(true);

      const res = await api.get("/patients");

      setPatients(res.patients || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const deletePatient = async (id: string) => {
    try {
      await api.delete(`/patients/${id}`);

      toast.success("Patient removed");

      fetchPatients();
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    }
  };

  const filtered = useMemo(() => {
    let data = [...patients];

    if (filter) {
      data = data.filter(
        (p) => p.status.toLowerCase() === filter.toLowerCase()
      );
    }

    if (q.trim()) {
      const search = q.toLowerCase();

      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.patientId.toLowerCase().includes(search)
      );
    }

    return data;
  }, [patients, q, filter]);

  const badgeClass = (status: string) => {
    if (status === "Active") {
      return "bg-success-soft text-success";
    }

    if (status === "Recovering") {
      return "bg-warning-soft text-warning";
    }

    return "bg-muted text-muted-foreground";
  };

  const initials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Patients
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length}{" "}
            {filter ? `${filter.toLowerCase()} ` : ""}
            patient{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Button
          onClick={() => navigate("/doctor/patients/new")}
          className="gradient-primary"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Patient
        </Button>
      </div>

      {/* SEARCH */}
      <div className="clinical-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search by name or patient ID..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="clinical-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">
            Loading patients...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-muted-foreground mb-3">
              No patients found
            </div>

            <Button
              variant="outline"
              onClick={() =>
                navigate("/doctor/patients/new")
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Add your first patient
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-4 font-medium">
                    Patient
                  </th>

                  <th className="text-left p-4 font-medium">
                    ID
                  </th>

                  <th className="text-left p-4 font-medium">
                    Diagnosis
                  </th>

                  <th className="text-left p-4 font-medium">
                    Status
                  </th>

                  <th className="text-right p-4 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    {/* PATIENT */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-semibold">
                          {initials(p.name)}
                        </div>

                        <div>
                          <div className="font-medium">
                            {p.name}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {p.age} yrs · {p.handSide} hand
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {p.patientId}
                    </td>

                    {/* DIAGNOSIS */}
                    <td className="p-4">
                      {p.diagnosis}
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass(
                          p.status
                        )}`}
                      >
                        {p.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(
                              `/doctor/patients/${p.id}`
                            )
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove patient?
                              </AlertDialogTitle>

                              <AlertDialogDescription>
                                This will permanently
                                remove {p.name} (
                                {p.patientId}) and all
                                related data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                Cancel
                              </AlertDialogCancel>

                              <AlertDialogAction
                                onClick={() =>
                                  deletePatient(p.id)
                                }
                                className="bg-destructive text-destructive-foreground"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(
                              `/doctor/patients/${p.id}`
                            )
                          }
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}