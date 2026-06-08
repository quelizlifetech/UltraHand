const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const {
  getActiveFinalizedPlan,
  getLatestPlan,
} = require("./plan.service");

/* ---------------------------------------------------
   Helpers
--------------------------------------------------- */

function computeDayInPlan(plan, sessionDate = new Date()) {
  const start = plan.startedAt || plan.createdAt;
  const startDate = new Date(start);
  const session = new Date(sessionDate);

  startDate.setHours(0, 0, 0, 0);
  session.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor(
    (session - startDate) / msPerDay
  );

  return Math.max(1, diffDays + 1);
}

function computeAvgROM(metrics) {
  if (!metrics || metrics.length === 0) return 0;
  const sum = metrics.reduce(
    (acc, m) => acc + Number(m.angle || 0),
    0
  );
  return +(sum / metrics.length).toFixed(2);
}

function computeRecoveryPercent(avgROM, targetROM) {
  if (!targetROM || targetROM <= 0) return 0;
  return +Math.min(100, (avgROM / targetROM) * 100).toFixed(1);
}

/**
 * Pick the best plan to attach sessions / show on chart.
 * Priority: finalized plan WITH aiReport > any plan WITH aiReport > newest plan.
 */
async function pickBestPlan(patientId) {
  const allPlans = await prisma.therapyPlan.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });

  if (!allPlans.length) return null;

  // 1) Finalized + has aiReport
  const finalizedWithAI = allPlans.find(
    (p) => p.isFinalized && p.aiReport
  );
  if (finalizedWithAI) return finalizedWithAI;

  // 2) Any plan with aiReport (newest)
  const anyWithAI = allPlans.find((p) => p.aiReport);
  if (anyWithAI) return anyWithAI;

  // 3) Newest plan, even if empty
  return allPlans[0];
}

/* ---------------------------------------------------
   Start Session
--------------------------------------------------- */
async function startSession(patientId) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    throw new ApiError(404, "Patient not found");
  }

  const plan = await pickBestPlan(patientId);

  if (!plan) {
    throw new ApiError(
      400,
      "No therapy plan for this patient"
    );
  }

  return {
    ok: true,
    patientId,
    planId: plan.id,
    dayInPlan: computeDayInPlan(plan),
    startedAt: new Date().toISOString(),
  };
}

/* ---------------------------------------------------
   Save Session
--------------------------------------------------- */
async function saveSession({
  patientId,
  painLevel,
  fatigue,
  notes,
  metrics,
  date,
}) {
  let plan = await pickBestPlan(patientId);

  if (!plan) {
    throw new ApiError(
      400,
      "No therapy plan exists for this patient. Generate a plan first."
    );
  }

  // If plan hasn't been started yet, start it now (first session)
  if (!plan.startedAt) {
    plan = await prisma.therapyPlan.update({
      where: { id: plan.id },
      data: { startedAt: new Date() },
    });
  }

  const sessionDate = date ? new Date(date) : new Date();
  const dayInPlan = computeDayInPlan(plan, sessionDate);
  const avgROM = computeAvgROM(metrics);
  const recoveryPercent = computeRecoveryPercent(
    avgROM,
    plan.targetROM
  );

  return prisma.session.upsert({
    where: {
      planId_dayInPlan: {
        planId: plan.id,
        dayInPlan,
      },
    },
    update: {
      painLevel,
      fatigue: !!fatigue,
      notes,
      avgROM,
      recoveryPercent,
      date: sessionDate,
      status: "Completed",
      metrics: {
        deleteMany: {},
        create: metrics,
      },
    },
    create: {
      planId: plan.id,
      patientId,
      dayInPlan,
      painLevel,
      fatigue: !!fatigue,
      notes,
      avgROM,
      recoveryPercent,
      date: sessionDate,
      status: "Completed",
      metrics: { create: metrics },
    },
    include: { metrics: true },
  });
}

/* ---------------------------------------------------
   List Sessions for Patient
--------------------------------------------------- */
async function listForPatient(patientId) {
  return prisma.session.findMany({
    where: { patientId },
    orderBy: { dayInPlan: "asc" },
    include: { metrics: true },
  });
}

/* ---------------------------------------------------
   Get Actual vs Predicted Data
--------------------------------------------------- */
async function getActualVsPredicted(patientId) {
  const plan = await pickBestPlan(patientId);

  if (!plan) {
    return {
      hasPlan: false,
      data: [],
      summary: null,
    };
  }

  const aiReport = plan.aiReport || {};
  const predictedCurve =
    aiReport.recovery_curve || aiReport.recoveryCurve || [];

  // Build a map of predicted ROM by day
  const predictedByDay = {};
  predictedCurve.forEach((p) => {
    const day = p.day ?? 0;
    if (day > 0) {
      predictedByDay[day] = {
        rom: p.rom ?? p.avgROM ?? 0,
        recovery: p.recovery ?? p.recoveryPercent ?? 0,
      };
    }
  });

  // Get all completed sessions for THIS plan
  const sessions = await prisma.session.findMany({
    where: {
      planId: plan.id,
      status: "Completed",
    },
    orderBy: { dayInPlan: "asc" },
    select: {
      dayInPlan: true,
      avgROM: true,
      recoveryPercent: true,
      date: true,
    },
  });

  // Also include sessions from OTHER plans for the same patient
  // (in case sessions were saved to an old plan before we picked this one)
  const allPatientSessions = await prisma.session.findMany({
    where: {
      patientId,
      status: "Completed",
    },
    orderBy: { dayInPlan: "asc" },
    select: {
      dayInPlan: true,
      avgROM: true,
      recoveryPercent: true,
      date: true,
      planId: true,
    },
  });

  // Use sessions from THIS plan if any, otherwise fall back to all patient sessions
  const sessionsToUse =
    sessions.length > 0 ? sessions : allPatientSessions;

  // Build a map of actual ROM by day
  const actualByDay = {};
  sessionsToUse.forEach((s) => {
    actualByDay[s.dayInPlan] = {
      rom: s.avgROM ?? 0,
      recovery: s.recoveryPercent ?? 0,
      date: s.date,
    };
  });

  // Determine the total number of days to plot
  const totalDays = Math.max(
    plan.totalDays || 0,
    predictedCurve.length,
    ...sessionsToUse.map((s) => s.dayInPlan),
    1
  );

  // Build merged data
  const data = [];
  for (let day = 1; day <= totalDays; day++) {
    const predicted = predictedByDay[day];
    const actual = actualByDay[day];

    data.push({
      day,
      predicted: predicted ? predicted.rom : null,
      predictedRecovery: predicted ? predicted.recovery : null,
      actual: actual ? actual.rom : null,
      actualRecovery: actual ? actual.recovery : null,
      hasActual: !!actual,
      date: actual ? actual.date : null,
    });
  }

  const completedSessions = sessionsToUse.length;
  const currentDayInPlan = computeDayInPlan(plan);
  const expectedSessionsSoFar = Math.min(
    currentDayInPlan,
    totalDays
  );

  const adherencePercent =
    expectedSessionsSoFar > 0
      ? +(
          (completedSessions / expectedSessionsSoFar) *
          100
        ).toFixed(1)
      : 0;

  // Deviation: latest actual vs predicted on same day
  let latestDeviation = null;
  if (sessionsToUse.length > 0) {
    const lastSession =
      sessionsToUse[sessionsToUse.length - 1];
    const predictedAtThatDay =
      predictedByDay[lastSession.dayInPlan];

    if (predictedAtThatDay) {
      latestDeviation = +(
        (lastSession.avgROM || 0) -
        predictedAtThatDay.rom
      ).toFixed(2);
    }
  }

  return {
    hasPlan: true,
    planId: plan.id,
    targetROM: plan.targetROM,
    totalDays,
    currentDayInPlan,
    completedSessions,
    expectedSessionsSoFar,
    adherencePercent,
    latestDeviation,
    data,
  };
}

module.exports = {
  startSession,
  saveSession,
  listForPatient,
  getActualVsPredicted,
};