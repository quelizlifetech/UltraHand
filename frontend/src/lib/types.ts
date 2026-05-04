export type Role = "doctor" | "patient";

export type HandSide = "Left" | "Right";
export type Severity = "Mild" | "Moderate" | "Severe";
export type PatientStatus = "Active" | "Recovering" | "Completed";

export interface ROM {
  index: { mcp: number; pip: number; dip: number };
  middle: { mcp: number; pip: number; dip: number };
  ring: { mcp: number; pip: number; dip: number };
  little: { mcp: number; pip: number; dip: number };
  thumb: { mcp: number; ip: number };
  wrist: { flexion: number; extension: number; radialDeviation: number; ulnarDeviation: number };
}

export interface TherapyPlan {
  intensity: "Low" | "Medium" | "High";
  repetitions: number;
  targetROM: number;
  sessionsPerDay: number;
  sessionDuration: number;
  mode: string;
  affectedJoints: string[];
  severity: Severity;
  finalized: boolean;
  active: boolean;
  therapyMode?: "Active" | "Passive" | "Assisted";
  targetArea?: "Fingers" | "Thumb" | "Wrist" | "Full Hand";
}

export interface SessionLog {
  id: string;
  date: string;
  romAchieved: number;
  pain: number;
  fatigue: boolean;
  movementQuality: "Good" | "Fair" | "Poor";
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  duration?: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  diagnosis: string;
  category: string;
  handSide: HandSide;
  status: PatientStatus;
  injury: string;
  recoveryStage: string;
  baselineROM: ROM;
  plan: TherapyPlan;
  sessions: SessionLog[];
  medications: Medication[];
  alerts: string[];
  createdAt: string;
}
