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

  /* ---------------- PATIENT INFO ---------------- */
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [category, setCategory] = useState("Post-surgical");
  const [handSide, setHandSide] = useState("Right");
  const [status, setStatus] = useState("Active");

  /* ---------------- THERAPY CONFIG ---------------- */
  const [sessionsPerDay, setSessionsPerDay] = useState("2");
  const [therapyMode, setTherapyMode] = useState("Active");
  const [durationMinutes, setDurationMinutes] = useState("20");
  const [affectedJoints, setAffectedJoints] = useState(
    "Wrist, Index MCP"
  );
  const [severityLevel, setSeverityLevel] =
    useState("Moderate");

  /* ---------------- ROM ---------------- */
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
    wrist_radial_deviation: 0,
    wrist_ulnar_deviation: 0,
  });

  /* ---------------- ACCOUNT ---------------- */
  const [phone, setPhone] = useState("");

  const updateRom = (key: string, value: number) => {
    setRom((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const submit = async () => {
    try {
      setLoading(true);

      await api.post("/patients", {
        name,
        age: Number(age),
        diagnosis,
        category,
        handSide,
        status,

        therapyConfig: {
          sessionsPerDay: Number(sessionsPerDay),
          therapyMode,
          durationMinutes: Number(durationMinutes),
          affectedJoints: affectedJoints
            .split(",")
            .map((j) => j.trim())
            .filter(Boolean),
          severityLevel,
        },

        baselineROM: rom,

        account: phone
          ? {
              phone,
              password: "12345",
            }
          : undefined,
      });

      toast.success(
        "Patient created successfully. Default password is 12345"
      );

      navigate("/doctor/patients");
    } catch (error: any) {
      toast.error(
        error.message || "Failed to create patient"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* BACK */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* TITLE */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Add Patient
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Create patient profile and therapy setup.
        </p>
      </div>

      {/* SECTION A */}
      <section className="clinical-card p-6 space-y-4">
        <h2 className="font-semibold">
          Patient Information
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
              onChange={(e) =>
                setAge(e.target.value)
              }
            />
          </div>

          <div>
            <Label>Diagnosis</Label>
            <Input
              value={diagnosis}
              onChange={(e) =>
                setDiagnosis(e.target.value)
              }
            />
          </div>

          <div>
            <Label>Category</Label>

            <Select
              value={category}
              onValueChange={setCategory}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Post-surgical">
                  Post-surgical
                </SelectItem>

                <SelectItem value="Fracture Recovery">
                  Fracture Recovery
                </SelectItem>

                <SelectItem value="Neurological">
                  Neurological
                </SelectItem>

                <SelectItem value="Tendon Injury">
                  Tendon Injury
                </SelectItem>

                <SelectItem value="Arthritis">
                  Arthritis
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Hand Side</Label>

            <Select
              value={handSide}
              onValueChange={setHandSide}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Left">
                  Left
                </SelectItem>

                <SelectItem value="Right">
                  Right
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>

            <Select
              value={status}
              onValueChange={setStatus}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Active">
                  Active
                </SelectItem>

                <SelectItem value="Recovering">
                  Recovering
                </SelectItem>

                <SelectItem value="Completed">
                  Completed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* SECTION B */}
      <section className="clinical-card p-6 space-y-4">
        <h2 className="font-semibold">
          Therapy Configuration
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Sessions Per Day</Label>
            <Input
              type="number"
              value={sessionsPerDay}
              onChange={(e) =>
                setSessionsPerDay(
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>Therapy Mode</Label>

            <Select
              value={therapyMode}
              onValueChange={setTherapyMode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Active">
                  Active
                </SelectItem>

                <SelectItem value="Passive">
                  Passive
                </SelectItem>

                <SelectItem value="Assisted">
                  Assisted
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              Duration Minutes
            </Label>

            <Input
              type="number"
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>
              Affected Joints
            </Label>

            <Input
              value={affectedJoints}
              onChange={(e) =>
                setAffectedJoints(
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>
              Severity Level
            </Label>

            <Select
              value={severityLevel}
              onValueChange={
                setSeverityLevel
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Mild">
                  Mild
                </SelectItem>

                <SelectItem value="Moderate">
                  Moderate
                </SelectItem>

                <SelectItem value="Severe">
                  Severe
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* SECTION C */}
      <section className="clinical-card p-6 space-y-6">
        <h2 className="font-semibold">
          Baseline ROM
        </h2>

        {/* INDEX */}
        <div>
          <p className="font-medium mb-3">
            Index Finger
          </p>

          <div className="grid grid-cols-3 gap-3">
            <ROMInput
              label="MCP"
              value={rom.index_mcp}
              onChange={(v) =>
                updateRom(
                  "index_mcp",
                  v
                )
              }
              min={0}
              max={90}
            />

            <ROMInput
              label="PIP"
              value={rom.index_pip}
              onChange={(v) =>
                updateRom(
                  "index_pip",
                  v
                )
              }
              min={0}
              max={110}
            />

            <ROMInput
              label="DIP"
              value={rom.index_dip}
              onChange={(v) =>
                updateRom(
                  "index_dip",
                  v
                )
              }
              min={0}
              max={90}
            />
          </div>
        </div>

        {/* MIDDLE */}
        <div>
          <p className="font-medium mb-3">
            Middle Finger
          </p>

          <div className="grid grid-cols-3 gap-3">
            <ROMInput
              label="MCP"
              value={rom.middle_mcp}
              onChange={(v) =>
                updateRom(
                  "middle_mcp",
                  v
                )
              }
              min={0}
              max={90}
            />

            <ROMInput
              label="PIP"
              value={rom.middle_pip}
              onChange={(v) =>
                updateRom(
                  "middle_pip",
                  v
                )
              }
              min={0}
              max={110}
            />

            <ROMInput
              label="DIP"
              value={rom.middle_dip}
              onChange={(v) =>
                updateRom(
                  "middle_dip",
                  v
                )
              }
              min={0}
              max={90}
            />
          </div>
        </div>

        {/* RING */}
        <div>
          <p className="font-medium mb-3">
            Ring Finger
          </p>

          <div className="grid grid-cols-3 gap-3">
            <ROMInput
              label="MCP"
              value={rom.ring_mcp}
              onChange={(v) =>
                updateRom(
                  "ring_mcp",
                  v
                )
              }
              min={0}
              max={90}
            />

            <ROMInput
              label="PIP"
              value={rom.ring_pip}
              onChange={(v) =>
                updateRom(
                  "ring_pip",
                  v
                )
              }
              min={0}
              max={110}
            />

            <ROMInput
              label="DIP"
              value={rom.ring_dip}
              onChange={(v) =>
                updateRom(
                  "ring_dip",
                  v
                )
              }
              min={0}
              max={90}
            />
          </div>
        </div>

        {/* LITTLE */}
        <div>
          <p className="font-medium mb-3">
            Little Finger
          </p>

          <div className="grid grid-cols-3 gap-3">
            <ROMInput
              label="MCP"
              value={rom.little_mcp}
              onChange={(v) =>
                updateRom(
                  "little_mcp",
                  v
                )
              }
              min={0}
              max={90}
            />

            <ROMInput
              label="PIP"
              value={rom.little_pip}
              onChange={(v) =>
                updateRom(
                  "little_pip",
                  v
                )
              }
              min={0}
              max={110}
            />

            <ROMInput
              label="DIP"
              value={rom.little_dip}
              onChange={(v) =>
                updateRom(
                  "little_dip",
                  v
                )
              }
              min={0}
              max={90}
            />
          </div>
        </div>

        {/* THUMB */}
        <div>
          <p className="font-medium mb-3">
            Thumb
          </p>

          <div className="grid grid-cols-2 gap-3">
            <ROMInput
              label="MCP"
              value={rom.thumb_mcp}
              onChange={(v) =>
                updateRom(
                  "thumb_mcp",
                  v
                )
              }
              min={0}
              max={70}
            />

            <ROMInput
              label="IP"
              value={rom.thumb_ip}
              onChange={(v) =>
                updateRom(
                  "thumb_ip",
                  v
                )
              }
              min={0}
              max={90}
            />
          </div>
        </div>

        {/* WRIST */}
        <div>
          <p className="font-medium mb-3">
            Wrist
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
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
              label="Radial Dev."
              value={
                rom.wrist_radial_deviation
              }
              onChange={(v) =>
                updateRom(
                  "wrist_radial_deviation",
                  v
                )
              }
              min={0}
              max={30}
            />

            <ROMInput
              label="Ulnar Dev."
              value={
                rom.wrist_ulnar_deviation
              }
              onChange={(v) =>
                updateRom(
                  "wrist_ulnar_deviation",
                  v
                )
              }
              min={0}
              max={45}
            />
          </div>
        </div>
      </section>

      {/* ACCOUNT */}
      <section className="clinical-card p-6 space-y-4">
        <h2 className="font-semibold">
          Patient Login Account
        </h2>

        <div>
          <Label>
            Phone Number
          </Label>

          <Input
            placeholder="Enter patient phone"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
          />

          <p className="text-xs text-muted-foreground mt-2">
            Default password:
            12345
          </p>
        </div>
      </section>

      {/* SUBMIT */}
      <Button
        onClick={submit}
        disabled={loading}
        className="gradient-primary w-full"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />

        {loading
          ? "Creating Patient..."
          : "Create Patient"}
      </Button>
    </div>
  );
}