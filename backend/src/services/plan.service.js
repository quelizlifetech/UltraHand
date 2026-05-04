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
   Build ML Payload from DB
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

      throw new Error(
        txt
      );
    }

    aiReport =
      await response.json();
  } catch (error) {
    console.log(
      "ML ERROR:",
      error.message
    );
  }

  /* -----------------------------------------
     Fallback if ML fails
  ----------------------------------------- */
  if (!aiReport) {
    aiReport = {
      success: true,
      summary: {
        predictedScore: 52,
        successChance: 68,
        riskLevel:
          "Moderate",
        estimatedDays: 18,
        recoveryPercent: 60,
      },
      recoveryCurve: [
        {
          day: 1,
          avgROM: 45,
        },
        {
          day: 5,
          avgROM: 55,
        },
        {
          day: 10,
          avgROM: 65,
        },
      ],
      jointAnalysis: [],
      daywisePlan: [],
      modeDistribution:
        {
          passive: 4,
          assistive: 8,
          active: 6,
        },
      warnings: [
        "Fallback mode used.",
      ],
    };
  }

  const score =
    num(
      aiReport.summary
        ?.predictedScore,
      55
    );

  let intensity =
    "Moderate";

  let repetitions = 15;

  if (score >= 75) {
    intensity = "High";
    repetitions = 22;
  } else if (
    score >= 55
  ) {
    intensity =
      "Moderate";
    repetitions = 18;
  } else {
    intensity = "Low";
    repetitions = 12;
  }

  const targetROM =
    Math.round(score);

  const createdPlan =
    await prisma.therapyPlan.create({
      data: {
        patientId,
        intensity,
        repetitions,
        targetROM,
        isApproved: false,
        isFinalized: false,
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