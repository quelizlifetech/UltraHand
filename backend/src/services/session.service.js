const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { getActiveFinalizedPlan } = require("./plan.service");

async function startSession(patientId) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new ApiError(404, "Patient not found");
  const plan = await getActiveFinalizedPlan(patientId);
  if (!plan) throw new ApiError(400, "No finalized therapy plan for this patient");
  return { ok: true, patientId, planId: plan.id, startedAt: new Date().toISOString() };
}

async function saveSession({ patientId, painLevel, fatigue, notes, metrics }) {
  const plan = await getActiveFinalizedPlan(patientId);
  if (!plan) throw new ApiError(400, "No finalized therapy plan for this patient");
  return prisma.session.create({
    data: {
      patientId,
      painLevel,
      fatigue: !!fatigue,
      notes,
      metrics: { create: metrics },
    },
    include: { metrics: true },
  });
}

async function listForPatient(patientId) {
  return prisma.session.findMany({
    where: { patientId },
    orderBy: { date: "desc" },
    include: { metrics: true },
  });
}

module.exports = { startSession, saveSession, listForPatient };
