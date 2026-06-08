import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ROMInput } from "@/components/forms/ROMInput";

/* ROM LIMITS — must match backend validators.js */
const ROM_LIMITS: Record<
  string,
  { min: number; max: number; label: string }
> = {
  index_mcp: { min: 0, max: 90, label: "Index MCP" },
  index_pip: { min: 0, max: 110, label: "Index PIP" },
  index_dip: { min: 0, max: 90, label: "Index DIP" },
  middle_mcp: { min: 0, max: 90, label: "Middle MCP" },
  middle_pip: { min: 0, max: 110, label: "Middle PIP" },
  middle_dip: { min: 0, max: 90, label: "Middle DIP" },
  ring_mcp: { min: 0, max: 90, label: "Ring MCP" },
  ring_pip: { min: 0, max: 110, label: "Ring PIP" },
  ring_dip: { min: 0, max: 90, label: "Ring DIP" },
  little_mcp: { min: 0, max: 90, label: "Little MCP" },
  little_pip: { min: 0, max: 110, label: "Little PIP" },
  little_dip: { min: 0, max: 90, label: "Little DIP" },
  thumb_mcp: { min: 0, max: 60, label: "Thumb MCP" },
  thumb_ip: { min: 0, max: 90, label: "Thumb IP" },
  wrist_flexion: { min: 0, max: 90, label: "Wrist Flexion" },
  wrist_extension: { min: 0, max: 80, label: "Wrist Extension" },
  wrist_radial_dev: { min: 0, max: 30, label: "Wrist Radial Dev" },
  wrist_ulnar_dev: { min: 0, max: 45, label: "Wrist Ulnar Dev" },
};

const FIELD_LIMITS = {
  age: { min: 1, max: 120 },
  sessionsPerDay: { min: 1, max: 10 },
  sessionsCompleted: { min: 0, max: 100 },
  durationMinutes: { min: 5, max: 120 },
  repsCompleted: { min: 1, max: 500 },
  stiffness: { min: 1, max: 5 },
};

export default function AddPatient() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const diagnosisToCategoryMap: Record<string, string> = {
    Stroke: "Neurological",
    "Cerebral Palsy": "Neurological",
    "Peripheral Neuropathy": "Neurological",
    "Rheumatoid Arthritis": "Musculoskeletal",
    Osteoarthritis: "Musculoskeletal",
    "Fracture Rehabilitation": "Musculoskeletal",
    "Tendon Repair": "Musculoskeletal",
    "Post Surgical": "Post_Operative",
    "Dupuytren Contracture": "Post_Operative",
  };

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");

  const [diagnosis, setDiagnosis] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [handSide, setHandSide] = useState<string>("Right");
  const [therapyMode, setTherapyMode] =
    useState<string>("Assistive");

  const [sessionsPerDay, setSessionsPerDay] = useState("");
  const [sessionsCompleted, setSessionsCompleted] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [repsCompleted, setRepsCompleted] = useState("");
  const [stiffness, setStiffness] = useState("");

  const initialRom = Object.keys(ROM_LIMITS).reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<string, number>
  );
  const [rom, setRom] = useState(initialRom);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const handleNumber =
    (
      setter: (v: string) => void,
      min: number,
      max: number
    ) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "") {
        setter("");
        return;
      }
      const val = Number(raw);
      if (isNaN(val)) return;
      setter(String(clamp(val, min, max)));
    };

  const handlePhone = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Strip non-digits, cap at 15
    const digits = e.target.value
      .replace(/\D/g, "")
      .slice(0, 15);
    setPhone(digits);
  };

  const updateRom = (key: string, value: number) => {
    const limit = ROM_LIMITS[key];
    if (!limit) return;
    setRom((prev) => ({
      ...prev,
      [key]: clamp(value, limit.min, limit.max),
    }));
  };

  const mapTherapyMode = (mode: string): string => {
    switch (String(mode)) {
      case "Mechanical":
        return "Mechanical";
      case "Passive":
        return "Passive";
      case "Active":
        return "Active";
      default:
        return "Assistive";
    }
  };

  const handleDiagnosisChange = (value: string) => {
    const safeValue = String(value);
    setDiagnosis(safeValue);
    setCategory(
      diagnosisToCategoryMap[safeValue] || "Other"
    );
  };

  /* VALIDATION */
  const errors = useMemo(() => {
    const errs: string[] = [];

    if (!name.trim() || name.trim().length < 2) {
      errs.push("Full name must be at least 2 characters");
    }

    const ageNum = Number(age);
    if (!age || ageNum < 1 || ageNum > 120) {
      errs.push("Age must be between 1 and 120");
    }

    // Phone validation — required for patient login
    if (!phone) {
      errs.push(
        "Phone number is required (used as patient login)"
      );
    } else if (phone.length < 10) {
      errs.push("Phone number must be at least 10 digits");
    } else if (phone.length > 15) {
      errs.push("Phone number cannot exceed 15 digits");
    }

    if (!diagnosis) errs.push("Diagnosis is required");
    if (!handSide) errs.push("Hand side is required");
    if (!therapyMode) errs.push("Therapy mode is required");

    const reqNumericFields: [
      string,
      string,
      { min: number; max: number }
    ][] = [
      [sessionsPerDay, "Sessions Per Day", FIELD_LIMITS.sessionsPerDay],
      [durationMinutes, "Duration", FIELD_LIMITS.durationMinutes],
      [repsCompleted, "Repetitions", FIELD_LIMITS.repsCompleted],
      [stiffness, "Stiffness", FIELD_LIMITS.stiffness],
    ];

    reqNumericFields.forEach(([val, label, limit]) => {
      if (val === "") {
        errs.push(`${label} is required`);
      } else {
        const n = Number(val);
        if (isNaN(n) || n < limit.min || n > limit.max) {
          errs.push(
            `${label} must be between ${limit.min} and ${limit.max}`
          );
        }
      }
    });

    Object.entries(ROM_LIMITS).forEach(([key, limit]) => {
      const v = rom[key];
      if (v < limit.min || v > limit.max) {
        errs.push(
          `${limit.label} must be between ${limit.min}° and ${limit.max}°`
        );
      }
    });

    return errs;
  }, [
    name,
    age,
    phone,
    diagnosis,
    handSide,
    therapyMode,
    sessionsPerDay,
    durationMinutes,
    repsCompleted,
    stiffness,
    rom,
  ]);

  const isValid = errors.length === 0;

  const submit = async () => {
    if (!isValid) {
      toast.error(
        errors[0] || "Please fix validation errors"
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: String(name).trim(),
        age: Number(age || 0),
        diagnosis: String(diagnosis),
        category: String(category),
        handSide: String(handSide),

        // Patient login account
        account: {
          phone: String(phone).trim(),
          password: "12345",
        },

        ml_input: {
          therapy_mode: String(
            mapTherapyMode(therapyMode)
          ),
          sessions_per_day: Number(sessionsPerDay || 1),
          sessions_completed: Number(
            sessionsCompleted || 0
          ),
          session_duration: Number(durationMinutes || 15),
          repetitions_completed: Number(repsCompleted || 10),
          stiffness: Number(stiffness || 3),
          joints: rom,
        },
      };

      await api.post("/patients", payload);

      toast.success(
        `Patient created. Login: ${phone} / 12345 (must change on first login)`
      );

      navigate("/doctor/patients");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.message || "Failed to create patient"
      );
    } finally {
      setLoading(false);
    }
  };

  const romInputFor = (key: string) => {
    const limit = ROM_LIMITS[key];
    return (
      <ROMInput
        label={limit.label.split(" ").slice(-1)[0]}
        value={rom[key]}
        onChange={(v) => updateRom(key, v)}
        min={limit.min}
        max={limit.max}
      />
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-semibold">Add Patient</h1>

      {/* PATIENT INFO */}
      <section className="clinical-card p-6 space-y-4">
        <h2 className="font-semibold">Patient Info</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>
              Age ({FIELD_LIMITS.age.min}-
              {FIELD_LIMITS.age.max})
            </Label>
            <Input
              type="number"
              min={FIELD_LIMITS.age.min}
              max={FIELD_LIMITS.age.max}
              value={age}
              onChange={handleNumber(
                setAge,
                FIELD_LIMITS.age.min,
                FIELD_LIMITS.age.max
              )}
            />
          </div>

          <div>
            <Label>Diagnosis</Label>
            <Select
              value={String(diagnosis)}
              onValueChange={(v) =>
                handleDiagnosisChange(String(v))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Diagnosis" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(diagnosisToCategoryMap).map(
                  (d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Category</Label>
            <Input value={String(category)} disabled />
          </div>

          <div>
            <Label>Hand Side</Label>
            <Select
              value={String(handSide)}
              onValueChange={(v) =>
                setHandSide(String(v))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Right">Right</SelectItem>
                <SelectItem value="Left">Left</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Therapy Mode</Label>
            <Select
              value={String(therapyMode)}
              onValueChange={(v) =>
                setTherapyMode(String(v))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mechanical">
                  Mechanical Stimulation
                </SelectItem>
                <SelectItem value="Passive">
                  Passive
                </SelectItem>
                <SelectItem value="Assistive">
                  Assistive
                </SelectItem>
                <SelectItem value="Active">
                  Active
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* PATIENT LOGIN ACCOUNT — NEW */}
      <section className="clinical-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Patient Login Account
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            The patient will use the phone number below as
            username, with default password{" "}
            <span className="font-mono font-semibold">
              12345
            </span>
            . They must change it on first login.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>
              Phone Number (10-15 digits)
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                value={phone}
                onChange={handlePhone}
                className="pl-10"
              />
            </div>
            {phone && phone.length < 10 && (
              <p className="text-[11px] text-amber-600 mt-1">
                Need {10 - phone.length} more digit
                {10 - phone.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <div>
            <Label>Default Password</Label>
            <Input value="12345" disabled />
            <p className="text-[11px] text-muted-foreground mt-1">
              Patient must change on first login
            </p>
          </div>
        </div>
      </section>

      {/* SESSION SETTINGS */}
      <section className="clinical-card p-6 grid md:grid-cols-2 gap-4">
        <div>
          <Label>
            Sessions Per Day (
            {FIELD_LIMITS.sessionsPerDay.min}-
            {FIELD_LIMITS.sessionsPerDay.max})
          </Label>
          <Input
            type="number"
            min={FIELD_LIMITS.sessionsPerDay.min}
            max={FIELD_LIMITS.sessionsPerDay.max}
            value={sessionsPerDay}
            onChange={handleNumber(
              setSessionsPerDay,
              FIELD_LIMITS.sessionsPerDay.min,
              FIELD_LIMITS.sessionsPerDay.max
            )}
          />
        </div>

        <div>
          <Label>
            Sessions Completed (
            {FIELD_LIMITS.sessionsCompleted.min}-
            {FIELD_LIMITS.sessionsCompleted.max})
          </Label>
          <Input
            type="number"
            min={FIELD_LIMITS.sessionsCompleted.min}
            max={FIELD_LIMITS.sessionsCompleted.max}
            value={sessionsCompleted}
            onChange={handleNumber(
              setSessionsCompleted,
              FIELD_LIMITS.sessionsCompleted.min,
              FIELD_LIMITS.sessionsCompleted.max
            )}
          />
        </div>

        <div>
          <Label>
            Duration min (
            {FIELD_LIMITS.durationMinutes.min}-
            {FIELD_LIMITS.durationMinutes.max})
          </Label>
          <Input
            type="number"
            min={FIELD_LIMITS.durationMinutes.min}
            max={FIELD_LIMITS.durationMinutes.max}
            value={durationMinutes}
            onChange={handleNumber(
              setDurationMinutes,
              FIELD_LIMITS.durationMinutes.min,
              FIELD_LIMITS.durationMinutes.max
            )}
          />
        </div>

        <div>
          <Label>
            Repetitions ({FIELD_LIMITS.repsCompleted.min}-
            {FIELD_LIMITS.repsCompleted.max})
          </Label>
          <Input
            type="number"
            min={FIELD_LIMITS.repsCompleted.min}
            max={FIELD_LIMITS.repsCompleted.max}
            value={repsCompleted}
            onChange={handleNumber(
              setRepsCompleted,
              FIELD_LIMITS.repsCompleted.min,
              FIELD_LIMITS.repsCompleted.max
            )}
          />
        </div>

        <div>
          <Label>
            Stiffness ({FIELD_LIMITS.stiffness.min}–
            {FIELD_LIMITS.stiffness.max})
          </Label>
          <Input
            type="number"
            min={FIELD_LIMITS.stiffness.min}
            max={FIELD_LIMITS.stiffness.max}
            value={stiffness}
            onChange={handleNumber(
              setStiffness,
              FIELD_LIMITS.stiffness.min,
              FIELD_LIMITS.stiffness.max
            )}
          />
        </div>
      </section>

      {/* ROM */}
      <section className="clinical-card p-6 space-y-6">
        <h2 className="font-semibold">Baseline ROM</h2>
        <p className="text-xs text-muted-foreground">
          Values clamped to clinical maximums per joint.
        </p>

        <div>
          <h3 className="font-medium mb-2">Index</h3>
          {romInputFor("index_mcp")}
          {romInputFor("index_pip")}
          {romInputFor("index_dip")}
        </div>

        <div>
          <h3 className="font-medium mb-2">Middle</h3>
          {romInputFor("middle_mcp")}
          {romInputFor("middle_pip")}
          {romInputFor("middle_dip")}
        </div>

        <div>
          <h3 className="font-medium mb-2">Ring</h3>
          {romInputFor("ring_mcp")}
          {romInputFor("ring_pip")}
          {romInputFor("ring_dip")}
        </div>

        <div>
          <h3 className="font-medium mb-2">Little</h3>
          {romInputFor("little_mcp")}
          {romInputFor("little_pip")}
          {romInputFor("little_dip")}
        </div>

        <div>
          <h3 className="font-medium mb-2">Thumb</h3>
          {romInputFor("thumb_mcp")}
          {romInputFor("thumb_ip")}
        </div>

        <div>
          <h3 className="font-medium mb-2">Wrist</h3>
          {romInputFor("wrist_flexion")}
          {romInputFor("wrist_extension")}
          {romInputFor("wrist_radial_dev")}
          {romInputFor("wrist_ulnar_dev")}
        </div>
      </section>

      {/* VALIDATION SUMMARY */}
      {!isValid && errors.length > 0 && (
        <section className="clinical-card p-4 border-l-4 border-amber-400 bg-amber-50/40">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700 mb-1">
                {errors.length} field
                {errors.length > 1
                  ? "s need"
                  : " needs"}{" "}
                attention
              </p>
              <ul className="text-xs text-amber-700/80 space-y-0.5">
                {errors.slice(0, 5).map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
                {errors.length > 5 && (
                  <li>
                    • ...and {errors.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      )}

      <Button
        onClick={submit}
        disabled={loading || !isValid}
        className="w-full"
      >
        <CheckCircle2 className="mr-2" />
        {loading
          ? "Creating..."
          : isValid
          ? "Create Patient"
          : "Fix errors to continue"}
      </Button>
    </div>
  );
}