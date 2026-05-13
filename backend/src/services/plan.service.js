const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");

/* ---------------------------------------------------
   ML API URL
--------------------------------------------------- */
const ML_API_URL =
  "http://127.0.0.1:8000/generate-plan";

/* ---------------------------------------------------
   Check doctor owns patient
--------------------------------------------------- */
async function assertDoctorOwnsPatient(
  doctorId,
  patientId
) {
  const patient =
    await prisma.patient.findUnique({
      where: { id: patientId },
    });

  if (!patient) {
    throw new ApiError(
      404,
      "Patient not found"
    );
  }

  if (
    patient.doctorId !== doctorId
  ) {
    throw new ApiError(
      403,
      "Not your patient"
    );
  }

  return patient;
}

/* ---------------------------------------------------
   Manual Create Plan
--------------------------------------------------- */
async function createPlan(
  doctorId,
  data
) {
  await assertDoctorOwnsPatient(
    doctorId,
    data.patientId
  );

  return prisma.therapyPlan.create({
    data,
  });
}

/* ---------------------------------------------------
   Get Plan
--------------------------------------------------- */
async function getPlan(
  doctorId,
  id
) {
  const plan =
    await prisma.therapyPlan.findUnique({
      where: { id },

      include: {
        patient: true,
      },
    });

  if (!plan) {
    throw new ApiError(
      404,
      "Plan not found"
    );
  }

  if (
    plan.patient.doctorId !==
    doctorId
  ) {
    throw new ApiError(
      403,
      "Not your patient"
    );
  }

  return plan;
}

/* ---------------------------------------------------
   Update Plan
--------------------------------------------------- */
async function updatePlan(
  doctorId,
  id,
  patch
) {
  const plan = await getPlan(
    doctorId,
    id
  );

  if (plan.isFinalized) {
    throw new ApiError(
      400,
      "Finalized plans cannot be edited"
    );
  }

  const {
    patientId: _ignore,
    ...rest
  } = patch;

  return prisma.therapyPlan.update({
    where: { id },

    data: rest,
  });
}

/* ---------------------------------------------------
   Approve Plan
--------------------------------------------------- */
async function approvePlan(
  doctorId,
  id
) {
  await getPlan(
    doctorId,
    id
  );

  return prisma.therapyPlan.update({
    where: { id },

    data: {
      isApproved: true,
    },
  });
}

/* ---------------------------------------------------
   Finalize Plan
--------------------------------------------------- */
async function finalizePlan(
  doctorId,
  id
) {
  const plan = await getPlan(
    doctorId,
    id
  );

  if (!plan.isApproved) {
    throw new ApiError(
      400,
      "Plan must be approved before finalization"
    );
  }

  return prisma.therapyPlan.update({
    where: { id },

    data: {
      isFinalized: true,
    },
  });
}

/* ---------------------------------------------------
   Get Latest Finalized Plan
--------------------------------------------------- */
async function getActiveFinalizedPlan(
  patientId
) {
  return prisma.therapyPlan.findFirst({
    where: {
      patientId,
      isFinalized: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

/* ---------------------------------------------------
   Safe Number
--------------------------------------------------- */
function num(v, d = 0) {
  const n = Number(v);

  return Number.isFinite(n)
    ? n
    : d;
}

/* ---------------------------------------------------
   Build ML Payload
--------------------------------------------------- */
function buildPayload(
  patient
) {
  const rom =
    patient.baselineROM ||
    {};

  const cfg =
    patient.therapyConfig ||
    {};

  return {
    age: num(
      patient.age,
      40
    ),

    diagnosis:
      patient.diagnosis ||
      "neurological",

    category:
      patient.category ||
      "neurological",

    handSide:
      patient.handSide ||
      "right",

    severityLevel:
      cfg.severityLevel ||
      "moderate",

    sessionsPerDay:
      num(
        cfg.sessionsPerDay,
        2
      ),

    durationMinutes:
      num(
        cfg.durationMinutes,
        20
      ),

    therapyMode:
      cfg.therapyMode ||
      "active",

    index_mcp:
      num(
        rom.index_mcp,
        40
      ),

    index_pip:
      num(
        rom.index_pip,
        50
      ),

    index_dip:
      num(
        rom.index_dip,
        35
      ),

    middle_mcp:
      num(
        rom.middle_mcp,
        40
      ),

    middle_pip:
      num(
        rom.middle_pip,
        50
      ),

    middle_dip:
      num(
        rom.middle_dip,
        35
      ),

    ring_mcp:
      num(
        rom.ring_mcp,
        40
      ),

    ring_pip:
      num(
        rom.ring_pip,
        50
      ),

    ring_dip:
      num(
        rom.ring_dip,
        35
      ),

    little_mcp:
      num(
        rom.little_mcp,
        40
      ),

    little_pip:
      num(
        rom.little_pip,
        50
      ),

    little_dip:
      num(
        rom.little_dip,
        35
      ),

    thumb_mcp:
      num(
        rom.thumb_mcp,
        30
      ),

    thumb_ip:
      num(
        rom.thumb_ip,
        30
      ),

    wrist_flexion:
      num(
        rom.wrist_flexion,
        35
      ),

    wrist_extension:
      num(
        rom.wrist_extension,
        30
      ),

    wrist_radial_deviation:
      num(
        rom.wrist_radial_deviation,
        10
      ),

    wrist_ulnar_deviation:
      num(
        rom.wrist_ulnar_deviation,
        15
      ),
  };
}

/* ---------------------------------------------------
   Normalize AI Report
--------------------------------------------------- */
function normalizeAIReport(report) {
  if (!report) {
    return null;
  }

  return {
    summary: {
      estimated_days:
        report.summary?.totalDays ||
        report.summary?.estimated_days ||
        0,

      recovery_percent:
        report.summary?.recoveryPercent ||
        report.summary?.recovery_percent ||
        0,

      success_chance:
        report.summary?.successChance ||
        report.summary?.success_chance ||
        report.summary?.recoveryPercent ||
        0,

      risk_level:
        report.summary?.riskLevel ||
        report.summary?.risk_level ||
        "Unknown",
    },

    recovery_curve:
      (
        report.recoveryCurve ||
        report.recovery_curve ||
        []
      ).map((item) => ({
        day:
          item.day || 0,

        rom:
          item.avgROM ||
          item.rom ||
          0,

        recovery:
          item.recoveryPercent ||
          item.recovery ||
          0,
      })),

    daywise_plan:
      (
        report.daywisePlan ||
        report.daywise_plan ||
        []
      ).map((item) => ({
        day:
          item.day || 0,

        mode:
          item.phase ||
          item.mode ||
          "Unknown",

        intensity:
          item.intensity ||
          "Moderate",

        repetitions:
          item.repetitions ||
          10,

        rom:
          item.avgROM ||
          item.rom ||
          0,
      })),

    joint_analysis:
      Array.isArray(
        report.joint_analysis
      )
        ? report.joint_analysis
        : Object.entries(
            report.jointSummary || {}
          ).map(
            ([joint, data]) => ({
              joint,

              improvement:
                (
                  data.normal_rom || 0
                ) -
                (
                  data.starting_rom || 0
                ),

              deficit:
                data.deficit || 0,
            })
          ),

    mode_distribution:
      report.modeDistribution ||
      report.mode_distribution ||
      {},

    warnings:
      report.warnings || [],
  };
}

/* ---------------------------------------------------
   AI Generate Plan
--------------------------------------------------- */
async function generateAIPlan(
  doctorId,
  patientId
) {
  await assertDoctorOwnsPatient(
    doctorId,
    patientId
  );

  const patient =
    await prisma.patient.findUnique({
      where: {
        id: patientId,
      },

      include: {
        therapyConfig: true,
        baselineROM: true,
      },
    });

  if (!patient) {
    throw new ApiError(
      404,
      "Patient not found"
    );
  }

  const payload =
    buildPayload(patient);

  let aiReport = null;

  try {
    const response =
      await fetch(
        ML_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

    if (!response.ok) {
      const txt =
        await response.text();

      throw new Error(txt);
    }

    aiReport =
      await response.json();

    console.log(
      "✅ ML RESPONSE:",
      JSON.stringify(
        aiReport,
        null,
        2
      )
    );
  } catch (error) {
    console.log(
      "❌ ML ERROR:",
      error.message
    );
  }

  /* ------------------------------------------------
     FALLBACK REPORT
  ------------------------------------------------ */

  if (
    !aiReport ||
    !aiReport.recoveryCurve ||
    aiReport.recoveryCurve.length === 0
  ) {
    console.log(
      "⚠️ USING FALLBACK AI REPORT"
    );

    aiReport = {
      summary: {
        totalDays: 18,
        recoveryPercent: 82,
        successChance: 76,
        riskLevel:
          "Moderate",
      },

      recoveryCurve:
        Array.from({
          length: 25,
        }).map((_, i) => ({
          day: i + 1,
          avgROM: 55 + i,
          recoveryPercent:
            40 + i * 2,
        })),

      daywisePlan:
        Array.from({
          length: 25,
        }).map((_, i) => ({
          day: i + 1,

          phase:
            i < 5
              ? "Passive"
              : i < 15
              ? "Assistive"
              : "Active",

          avgROM: 55 + i,

          repetitions: 15,

          intensity:
            "Moderate",
        })),

      jointSummary: {
        index_mcp: {
          normal_rom: 90,
          starting_rom: 70,
          deficit: 20,
        },

        middle_mcp: {
          normal_rom: 90,
          starting_rom: 65,
          deficit: 25,
        },

        ring_mcp: {
          normal_rom: 90,
          starting_rom: 72,
          deficit: 18,
        },

        thumb_mcp: {
          normal_rom: 60,
          starting_rom: 45,
          deficit: 15,
        },
      },

      modeDistribution:
        {
          Active: 10,
          Assistive: 8,
          Passive: 7,
        },

      warnings: [
        "Fallback AI report used",
      ],
    };
  }

  aiReport =
    normalizeAIReport(
      aiReport
    );

  /* ------------------------------------------------
     PLAN GENERATION
  ------------------------------------------------ */

  const recovery =
    num(
      aiReport.summary
        ?.recovery_percent,
      60
    );

  let intensity =
    "Moderate";

  let repetitions = 18;

  if (recovery >= 85) {
    intensity = "High";
    repetitions = 24;
  } else if (
    recovery >= 60
  ) {
    intensity =
      "Moderate";
    repetitions = 18;
  } else {
    intensity = "Low";
    repetitions = 12;
  }

  const targetROM =
    Math.round(
      recovery
    );

  /* ------------------------------------------------
     SAVE PLAN + AI REPORT
  ------------------------------------------------ */

  const createdPlan =
    await prisma.therapyPlan.create({
      data: {
        patientId,

        intensity,

        repetitions,

        targetROM,

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

  return {
    ...createdPlan,

    aiReport,
  };
}

module.exports = {
  createPlan,
  getPlan,
  updatePlan,
  approvePlan,
  finalizePlan,
  getActiveFinalizedPlan,
  assertDoctorOwnsPatient,
  generateAIPlan,
};