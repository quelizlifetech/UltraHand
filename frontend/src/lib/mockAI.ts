import { ROM, TherapyPlan, Severity } from "./types";

export interface AIPlanSuggestion {
  intensity: TherapyPlan["intensity"];
  repetitions: number;
  targetROM: number;
  rationale: string;
  confidence: number;
}

const avgROM = (rom: ROM) => {
  const all = [
    rom.index.mcp, rom.index.pip, rom.index.dip,
    rom.middle.mcp, rom.middle.pip, rom.middle.dip,
    rom.ring.mcp, rom.ring.pip, rom.ring.dip,
    rom.little.mcp, rom.little.pip, rom.little.dip,
    rom.thumb.mcp, rom.thumb.ip,
    rom.wrist.flexion, rom.wrist.extension,
  ];
  return all.reduce((a, b) => a + b, 0) / all.length;
};

export function generatePlanSuggestion(rom: ROM, severity: Severity): AIPlanSuggestion {
  const avg = avgROM(rom);
  const sevFactor = severity === "Severe" ? 0.6 : severity === "Moderate" ? 0.8 : 1;
  const intensity: TherapyPlan["intensity"] =
    avg < 45 ? "Low" : avg < 70 ? "Medium" : "High";
  const repetitions = Math.round(8 + (avg / 10) * sevFactor);
  const targetROM = Math.min(95, Math.round(avg + 20 * sevFactor));
  return {
    intensity,
    repetitions,
    targetROM,
    rationale: `Based on baseline avg ROM ${avg.toFixed(1)}° and ${severity.toLowerCase()} severity.`,
    confidence: Math.round(72 + Math.random() * 18),
  };
}

export function predictedRecoveryCurve(currentROM: number, days = 30) {
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    predicted: Math.min(95, currentROM + (95 - currentROM) * (1 - Math.exp(-i / 9))),
  }));
}

export function aiPredictionTable() {
  return Array.from({ length: 8 }, (_, i) => ({
    session: i + 1,
    targetROM: Math.round(50 + i * 4.5),
    intensity: i < 2 ? "Low" : i < 5 ? "Medium" : "High",
    repetitions: 8 + i,
  }));
}
