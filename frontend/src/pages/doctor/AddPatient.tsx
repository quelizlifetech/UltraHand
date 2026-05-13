import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
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

  // ✅ FORCE STRING TYPES
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [handSide, setHandSide] = useState<string>("Right");
  const [therapyMode, setTherapyMode] =
    useState<string>("Assistive");

  const [sessionsPerDay, setSessionsPerDay] =
    useState("");

  const [sessionsCompleted, setSessionsCompleted] =
    useState("");

  const [durationMinutes, setDurationMinutes] =
    useState("");

  const [repsCompleted, setRepsCompleted] =
    useState("");

  const [stiffness, setStiffness] = useState("");

  const clamp = (
    val: number,
    min: number,
    max: number
  ) => Math.max(min, Math.min(max, val));

  const handleNumber =
    (
      setter: (v: string) => void,
      min: number,
      max: number
    ) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;

      if (raw === "") {
        setter("");
        return;
      }

      let val = Number(raw);

      if (isNaN(val)) return;

      val = clamp(val, min, max);

      setter(String(val));
    };

  // ✅ FIXED
  const mapTherapyMode = (
    mode: string
  ): string => {
    const safeMode = String(mode);

    switch (safeMode) {
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

  const [rom, setRom] = useState({
    index_mcp: 0,
    index_pip: 0,
    index_dip: 0,

    middle_mcp: 0,
    middle_pip: 0,
    middle_dip: 0,

    ring_mcp: 0,
    ring_pip: 0,
    ring_dip: 0,

    little_mcp: 0,
    little_pip: 0,
    little_dip: 0,

    thumb_mcp: 0,
    thumb_ip: 0,

    wrist_flexion: 0,
    wrist_extension: 0,

    wrist_radial_dev: 0,
    wrist_ulnar_dev: 0,
  });

  const updateRom = (
    key: string,
    value: number
  ) => {
    setRom((prev) => ({
      ...prev,
      [key]: clamp(value, 0, 120),
    }));
  };

  // ✅ FIXED
  const handleDiagnosisChange = (
    value: string
  ) => {
    const safeValue = String(value);

    setDiagnosis(safeValue);

    setCategory(
      diagnosisToCategoryMap[safeValue] ||
        "Other"
    );
  };

  const submit = async () => {
    try {
      setLoading(true);

      // ✅ DEBUG
      console.log({
        diagnosis,
        category,
        therapyMode,
      });

      const payload = {
        name: String(name),

        age: Number(age || 0),

        // ✅ FORCE STRINGS
        diagnosis: String(diagnosis),

        category: String(category),

        handSide: String(handSide),

        ml_input: {
          // ✅ FORCE STRING
          therapy_mode: String(
            mapTherapyMode(therapyMode)
          ),

          sessions_per_day: Number(
            sessionsPerDay || 1
          ),

          sessions_completed: Number(
            sessionsCompleted || 0
          ),

          session_duration: Number(
            durationMinutes || 15
          ),

          repetitions_completed: Number(
            repsCompleted || 10
          ),

          stiffness: Number(stiffness || 3),

          joints: rom,
        },
      };

      console.log(
        "FINAL PAYLOAD:",
        JSON.stringify(payload, null, 2)
      );

      await api.post("/patients", payload);

      toast.success(
        "Patient created successfully"
      );

      navigate("/doctor/patients");
    } catch (error: any) {
      console.error(error);

      toast.error(
        error.message || "Validation failed"
      );
    } finally {
      setLoading(false);
    }
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

      <h1 className="text-2xl font-semibold">
        Add Patient
      </h1>

      {/* PATIENT INFO */}
      <section className="clinical-card p-6 space-y-4">
        <h2 className="font-semibold">
          Patient Info
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>

            <Input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div>
            <Label>Age</Label>

            <Input
              type="number"
              value={age}
              onChange={handleNumber(
                setAge,
                1,
                120
              )}
            />
          </div>

          <div>
            <Label>Diagnosis</Label>

            <Select
              value={String(diagnosis)}
              onValueChange={(v) =>
                handleDiagnosisChange(
                  String(v)
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Diagnosis" />
              </SelectTrigger>

              <SelectContent>
                {Object.keys(
                  diagnosisToCategoryMap
                ).map((d) => (
                  <SelectItem
                    key={d}
                    value={String(d)}
                  >
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Category</Label>

            <Input
              value={String(category)}
              disabled
            />
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
                <SelectItem value="Right">
                  Right
                </SelectItem>

                <SelectItem value="Left">
                  Left
                </SelectItem>

                <SelectItem value="Both">
                  Both
                </SelectItem>
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

      {/* SESSION */}
      <section className="clinical-card p-6 grid md:grid-cols-2 gap-4">
        <div>
          <Label>Sessions Per Day</Label>

          <Input
            type="number"
            value={sessionsPerDay}
            onChange={handleNumber(
              setSessionsPerDay,
              1,
              10
            )}
          />
        </div>

        <div>
          <Label>Sessions Completed</Label>

          <Input
            type="number"
            value={sessionsCompleted}
            onChange={handleNumber(
              setSessionsCompleted,
              0,
              10
            )}
          />
        </div>

        <div>
          <Label>Duration (min)</Label>

          <Input
            type="number"
            value={durationMinutes}
            onChange={handleNumber(
              setDurationMinutes,
              5,
              60
            )}
          />
        </div>

        <div>
          <Label>Repetitions</Label>

          <Input
            type="number"
            value={repsCompleted}
            onChange={handleNumber(
              setRepsCompleted,
              1,
              100
            )}
          />
        </div>

        <div>
          <Label>Stiffness (1–5)</Label>

          <Input
            type="number"
            value={stiffness}
            onChange={handleNumber(
              setStiffness,
              1,
              5
            )}
          />
        </div>
      </section>

      {/* FULL ROM — ALL FINGERS */}
      <section className="clinical-card p-6 space-y-6">
        <h2 className="font-semibold">
          Baseline ROM
        </h2>

        <div>
          <h3>Index</h3>

          <ROMInput
            label="MCP"
            value={rom.index_mcp}
            onChange={(v) =>
              updateRom("index_mcp", v)
            }
            min={0}
            max={90}
          />

          <ROMInput
            label="PIP"
            value={rom.index_pip}
            onChange={(v) =>
              updateRom("index_pip", v)
            }
            min={0}
            max={110}
          />

          <ROMInput
            label="DIP"
            value={rom.index_dip}
            onChange={(v) =>
              updateRom("index_dip", v)
            }
            min={0}
            max={90}
          />
        </div>

        <div>
          <h3>Middle</h3>

          <ROMInput
            label="MCP"
            value={rom.middle_mcp}
            onChange={(v) =>
              updateRom("middle_mcp", v)
            }
            min={0}
            max={90}
          />

          <ROMInput
            label="PIP"
            value={rom.middle_pip}
            onChange={(v) =>
              updateRom("middle_pip", v)
            }
            min={0}
            max={110}
          />

          <ROMInput
            label="DIP"
            value={rom.middle_dip}
            onChange={(v) =>
              updateRom("middle_dip", v)
            }
            min={0}
            max={90}
          />
        </div>

        <div>
          <h3>Ring</h3>

          <ROMInput
            label="MCP"
            value={rom.ring_mcp}
            onChange={(v) =>
              updateRom("ring_mcp", v)
            }
            min={0}
            max={90}
          />

          <ROMInput
            label="PIP"
            value={rom.ring_pip}
            onChange={(v) =>
              updateRom("ring_pip", v)
            }
            min={0}
            max={110}
          />

          <ROMInput
            label="DIP"
            value={rom.ring_dip}
            onChange={(v) =>
              updateRom("ring_dip", v)
            }
            min={0}
            max={90}
          />
        </div>

        <div>
          <h3>Little</h3>

          <ROMInput
            label="MCP"
            value={rom.little_mcp}
            onChange={(v) =>
              updateRom("little_mcp", v)
            }
            min={0}
            max={90}
          />

          <ROMInput
            label="PIP"
            value={rom.little_pip}
            onChange={(v) =>
              updateRom("little_pip", v)
            }
            min={0}
            max={110}
          />

          <ROMInput
            label="DIP"
            value={rom.little_dip}
            onChange={(v) =>
              updateRom("little_dip", v)
            }
            min={0}
            max={90}
          />
        </div>

        <div>
          <h3>Thumb</h3>

          <ROMInput
            label="MCP"
            value={rom.thumb_mcp}
            onChange={(v) =>
              updateRom("thumb_mcp", v)
            }
            min={0}
            max={70}
          />

          <ROMInput
            label="IP"
            value={rom.thumb_ip}
            onChange={(v) =>
              updateRom("thumb_ip", v)
            }
            min={0}
            max={90}
          />
        </div>

        <div>
          <h3>Wrist</h3>

          <ROMInput
            label="Flexion"
            value={rom.wrist_flexion}
            onChange={(v) =>
              updateRom(
                "wrist_flexion",
                v
              )
            }
            min={0}
            max={90}
          />

          <ROMInput
            label="Extension"
            value={rom.wrist_extension}
            onChange={(v) =>
              updateRom(
                "wrist_extension",
                v
              )
            }
            min={0}
            max={90}
          />

          <ROMInput
            label="Radial Dev"
            value={rom.wrist_radial_dev}
            onChange={(v) =>
              updateRom(
                "wrist_radial_dev",
                v
              )
            }
            min={0}
            max={30}
          />

          <ROMInput
            label="Ulnar Dev"
            value={rom.wrist_ulnar_dev}
            onChange={(v) =>
              updateRom(
                "wrist_ulnar_dev",
                v
              )
            }
            min={0}
            max={45}
          />
        </div>
      </section>

      <Button
        onClick={submit}
        disabled={loading}
        className="w-full"
      >
        <CheckCircle2 className="mr-2" />

        {loading
          ? "Creating..."
          : "Create Patient"}
      </Button>
    </div>
  );
}