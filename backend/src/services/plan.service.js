const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");

/* ---------------------------------------------------
   ML API URL
--------------------------------------------------- */
const ML_API_URL =
  process.env.ML_API_URL ||
  "http://127.0.0.1:8000/generate-plan";

/* ---------------------------------------------------
   Check doctor owns patient
--------------------------------------------------- */
async function assertDoctorOwnsPatient(doctorId, patientId) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    throw new ApiError(404, "Patient not found");
  }

  if (patient.doctorId !== doctorId) {
    throw new ApiError(403, "Not your patient");
  }

  return patient;
}

/* ---------------------------------------------------
   Manual Create Plan
--------------------------------------------------- */
async function createPlan(doctorId, data) {
  await assertDoctorOwnsPatient(doctorId, data.patientId);

  return prisma.therapyPlan.create({ data });
}

/* ---------------------------------------------------
   Get Plan
--------------------------------------------------- */
async function getPlan(doctorId, id) {
  const plan = await prisma.therapyPlan.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (plan.patient.doctorId !== doctorId) {
    throw new ApiError(403, "Not your patient");
  }

  return plan;
}

/* ---------------------------------------------------
   Update Plan
--------------------------------------------------- */
async function updatePlan(doctorId, id, patch) {
  const plan = await getPlan(doctorId, id);

  if (plan.isFinalized) {
    throw new ApiError(400, "Finalized plans cannot be edited");
  }

  const { patientId: _ignore, ...rest } = patch;

  return prisma.therapyPlan.update({
    where: { id },
    data: rest,
  });
}

/* ---------------------------------------------------
   Approve Plan
--------------------------------------------------- */
async function approvePlan(doctorId, id) {
  await getPlan(doctorId, id);

  return prisma.therapyPlan.update({
    where: { id },
    data: { isApproved: true },
  });
}

/* ---------------------------------------------------
   Finalize Plan
   ────────────────────────────────────────────────
   Auto-approves the plan if not already approved,
   then finalizes it and sets startedAt.
--------------------------------------------------- */
async function finalizePlan(doctorId, id) {
  const plan = await getPlan(doctorId, id);

  // Auto-approve if not already approved
  if (!plan.isApproved) {
    await prisma.therapyPlan.update({
      where: { id },
      data: { isApproved: true },
    });
  }

  return prisma.therapyPlan.update({
    where: { id },
    data: {
      isApproved: true,
      isFinalized: true,
      startedAt: plan.startedAt || new Date(),
    },
  });
}

/* ---------------------------------------------------
   Get Latest Finalized Plan
--------------------------------------------------- */
async function getActiveFinalizedPlan(patientId) {
  return prisma.therapyPlan.findFirst({
    where: {
      patientId,
      isFinalized: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/* ---------------------------------------------------
   Get Latest Plan (finalized OR not)
--------------------------------------------------- */
async function getLatestPlan(patientId) {
  return prisma.therapyPlan.findFirst({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
}

/* ---------------------------------------------------
   Safe Number
--------------------------------------------------- */
function num(v, d = 0) {
  if (v === null || v === undefined) return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/* ---------------------------------------------------
   Build ML Payload
--------------------------------------------------- */
function buildPayload(patient) {
  const rom = patient.baselineROM || {};
  const cfg = patient.therapyConfig || {};

  return {
    age: num(patient.age, 40),
    diagnosis: patient.diagnosis || "neurological",
    category: patient.category || "neurological",
    handSide: patient.handSide || "right",
    severityLevel: cfg.severityLevel || "moderate",
    sessionsPerDay: num(cfg.sessionsPerDay, 2),
    durationMinutes: num(cfg.durationMinutes, 20),
    therapyMode: cfg.therapyMode || "active",

    index_mcp: num(rom.index_mcp, 40),
    index_pip: num(rom.index_pip, 50),
    index_dip: num(rom.index_dip, 35),

    middle_mcp: num(rom.middle_mcp, 40),
    middle_pip: num(rom.middle_pip, 50),
    middle_dip: num(rom.middle_dip, 35),

    ring_mcp: num(rom.ring_mcp, 40),
    ring_pip: num(rom.ring_pip, 50),
    ring_dip: num(rom.ring_dip, 35),

    little_mcp: num(rom.little_mcp, 40),
    little_pip: num(rom.little_pip, 50),
    little_dip: num(rom.little_dip, 35),

    thumb_mcp: num(rom.thumb_mcp, 30),
    thumb_ip: num(rom.thumb_ip, 30),

    wrist_flexion: num(rom.wrist_flexion, 35),
    wrist_extension: num(rom.wrist_extension, 30),
    wrist_radial_deviation: num(rom.wrist_radial_deviation, 10),
    wrist_ulnar_deviation: num(rom.wrist_ulnar_deviation, 15),
  };
}

/* ---------------------------------------------------
   Normalize AI Report
--------------------------------------------------- */
function normalizeAIReport(report) {
  if (!report) return null;

  const s = report.summary || {};

  return {
    summary: {
      estimated_days:
        s.estimatedDays ??
        s.totalDays ??
        s.estimated_days ??
        0,

      target_reached_day:
        s.targetReachedDay ?? s.target_reached_day ?? null,

      current_avg_rom:
        s.currentAvgROM ?? s.current_avg_rom ?? 0,

      target_avg_rom:
        s.targetAvgROM ?? s.target_avg_rom ?? 90,

      final_avg_rom:
        s.finalAvgROM ?? s.final_avg_rom ?? 0,

      baseline_recovery_percent:
        s.baselineRecoveryPercent ??
        s.baseline_recovery_percent ??
        0,

      predicted_recovery_percent:
        s.predictedRecoveryPercent ??
        s.predicted_recovery_percent ??
        0,

      final_rom_percent:
        s.finalROMPercent ?? s.final_rom_percent ?? 0,

      recovery_percent:
        s.recoveryPercent ??
        s.recovery_percent ??
        s.predictedRecoveryPercent ??
        0,

      success_chance:
        s.successChance ?? s.success_chance ?? 0,

      risk_level:
        s.riskLevel || s.risk_level || "Unknown",
    },

    recovery_curve: (
      report.recoveryCurve ||
      report.recovery_curve ||
      []
    ).map((item) => ({
      day: item.day ?? 0,
      rom: item.avgROM ?? item.rom ?? 0,
      recovery:
        item.recoveryPercent ?? item.recovery ?? 0,
    })),

    daywise_plan: (
      report.daywisePlan ||
      report.daywise_plan ||
      []
    ).map((item) => ({
      day: item.day ?? 0,
      mode: item.phase || item.mode || "Unknown",
      intensity: item.intensity || "Moderate",
      repetitions: item.repetitions ?? 10,
      rom: item.avgROM ?? item.rom ?? 0,
      recovery:
        item.recoveryPercent ?? item.recovery ?? 0,
    })),

    joint_analysis: (
      report.jointAnalysis ||
      report.joint_analysis ||
      []
    ).map((item) => ({
      joint: item.joint || "Unknown",
      starting: item.starting ?? item.starting_rom ?? 0,
      normal: item.normal ?? item.normal_rom ?? 0,
      improvement: item.gain ?? item.improvement ?? 0,
      deficit: item.deficit ?? 0,
    })),

    mode_distribution:
      report.modeDistribution ||
      report.mode_distribution ||
      {},

    journey: report.journey || [],
    warnings: report.warnings || [],
  };
}

/* ---------------------------------------------------
   Has Valid ML Response Check
--------------------------------------------------- */
function hasValidMLResponse(report) {
  if (!report) return false;
  const curveLength =
    (report.recoveryCurve?.length || 0) +
    (report.recovery_curve?.length || 0);
  return curveLength > 0;
}

/* ---------------------------------------------------
   AI Generate Plan
   ────────────────────────────────────────────────
   If a non-finalized plan exists, UPDATE it instead
   of creating a new one. This prevents duplicate
   drafts when doctor regenerates.
--------------------------------------------------- */
async function generateAIPlan(doctorId, patientId) {
  await assertDoctorOwnsPatient(doctorId, patientId);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      therapyConfig: true,
      baselineROM: true,
    },
  });

  if (!patient) {
    throw new ApiError(404, "Patient not found");
  }

  const payload = buildPayload(patient);
  let aiReport = null;

  try {
    const response = await fetch(ML_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(txt);
    }

    aiReport = await response.json();
    console.log("✅ ML RESPONSE received");
  } catch (error) {
    console.error("❌ ML ERROR:", error.message);
  }

  /* ----- FALLBACK REPORT ----- */
  if (!hasValidMLResponse(aiReport)) {
    console.warn("⚠️ USING FALLBACK AI REPORT");

    aiReport = {
      summary: {
        totalDays: 18,
        estimatedDays: 18,
        targetReachedDay: 15,
        currentAvgROM: 55,
        targetAvgROM: 80,
        finalAvgROM: 80,
        baselineRecoveryPercent: 68.7,
        predictedRecoveryPercent: 100,
        finalROMPercent: 100,
        recoveryPercent: 100,
        successChance: 76,
        riskLevel: "Moderate",
      },
      recoveryCurve: Array.from({ length: 18 }).map((_, i) => ({
        day: i + 1,
        avgROM: 55 + (i * 25) / 17,
        recoveryPercent: (i + 1) * (100 / 18),
      })),
      daywisePlan: Array.from({ length: 18 }).map((_, i) => ({
        day: i + 1,
        phase:
          i < 5 ? "Passive" : i < 13 ? "Assistive" : "Active",
        avgROM: 55 + (i * 25) / 17,
        recoveryPercent: (i + 1) * (100 / 18),
        repetitions: 15,
        intensity: "Moderate",
      })),
      jointAnalysis: [
        {
          joint: "index_mcp",
          starting: 70,
          normal: 90,
          gain: 20,
          deficit: 20,
        },
        {
          joint: "middle_mcp",
          starting: 65,
          normal: 90,
          gain: 25,
          deficit: 25,
        },
      ],
      modeDistribution: { Passive: 5, Assistive: 8, Active: 5 },
      warnings: ["Fallback AI report used — ML service may be down"],
    };
  }

  aiReport = normalizeAIReport(aiReport);

  /* ----- DERIVE PLAN PARAMS ----- */
  const predictedRecovery = num(
    aiReport.summary?.predicted_recovery_percent,
    60
  );

  let intensity = "Moderate";
  let repetitions = 18;

  if (predictedRecovery >= 85) {
    intensity = "High";
    repetitions = 24;
  } else if (predictedRecovery >= 60) {
    intensity = "Moderate";
    repetitions = 18;
  } else {
    intensity = "Low";
    repetitions = 12;
  }

  const targetROM = Math.round(
    num(aiReport.summary?.target_avg_rom, 90)
  );

  const totalDays = Math.round(
    num(aiReport.summary?.estimated_days, 0)
  );

  /* ----- REUSE OR CREATE PLAN ----- */
  // Find any non-finalized plan for this patient
  const existingDraft = await prisma.therapyPlan.findFirst({
    where: {
      patientId,
      isFinalized: false,
    },
    orderBy: { createdAt: "desc" },
  });

  let savedPlan;

  if (existingDraft) {
    // UPDATE the existing draft instead of creating a duplicate
    savedPlan = await prisma.therapyPlan.update({
      where: { id: existingDraft.id },
      data: {
        intensity,
        repetitions,
        targetROM,
        totalDays,
        aiReport,
        isApproved: false,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            diagnosis: true,
          },
        },
      },
    });
    console.log(
      "✅ Updated existing draft plan",
      existingDraft.id
    );
  } else {
    // No draft exists — create a new plan
    savedPlan = await prisma.therapyPlan.create({
      data: {
        patientId,
        intensity,
        repetitions,
        targetROM,
        totalDays,
        aiReport,
        isApproved: false,
        isFinalized: false,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            diagnosis: true,
          },
        },
      },
    });
    console.log("✅ Created new plan", savedPlan.id);
  }

  return { ...savedPlan, aiReport };
}

module.exports = {
  createPlan,
  getPlan,
  updatePlan,
  approvePlan,
  finalizePlan,
  getActiveFinalizedPlan,
  getLatestPlan,
  assertDoctorOwnsPatient,
  generateAIPlan,
};