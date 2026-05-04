const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");

const JOINT_TO_BASELINE = {
  index_mcp: "index_mcp", index_pip: "index_pip", index_dip: "index_dip",
  middle_mcp: "middle_mcp", middle_pip: "middle_pip", middle_dip: "middle_dip",
  ring_mcp: "ring_mcp", ring_pip: "ring_pip", ring_dip: "ring_dip",
  little_mcp: "little_mcp", little_pip: "little_pip", little_dip: "little_dip",
  thumb_mcp: "thumb_mcp", thumb_ip: "thumb_ip",
  wrist_flexion: "wrist_flexion", wrist_extension: "wrist_extension",
  wrist_radial_deviation: "wrist_radial_deviation", wrist_ulnar_deviation: "wrist_ulnar_deviation",
};

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}

async function getProgress(patientId) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { baselineROM: true, sessions: { orderBy: { date: "asc" }, include: { metrics: true } } },
  });
  if (!patient) throw new ApiError(404, "Patient not found");
  if (!patient.baselineROM) throw new ApiError(400, "Missing baseline ROM");

  const baseline = patient.baselineROM;

  const actual = patient.sessions.map((s) => {
    const improvements = [];
    for (const m of s.metrics) {
      const key = JOINT_TO_BASELINE[m.jointName];
      if (!key) continue;
      const base = baseline[key];
      if (!base || base <= 0) continue;
      improvements.push(((m.angle - base) / base) * 100);
    }
    return {
      sessionId: s.id,
      date: s.date,
      improvementPct: Number(avg(improvements).toFixed(2)),
      painLevel: s.painLevel,
    };
  });

  const last = actual[actual.length - 1]?.improvementPct ?? 0;
  // Mock predicted progression (placeholder; ML will replace this)
  const predicted = Array.from({ length: 5 }).map((_, i) => ({
    step: i + 1,
    predictedImprovementPct: Number((last + (i + 1) * 2.5).toFixed(2)),
  }));

  return { patientId, actual, predicted };
}

module.exports = { getProgress };
