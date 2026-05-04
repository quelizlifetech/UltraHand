const prisma = require("../prisma/client");

const PAIN_THRESHOLD = Number(process.env.PAIN_ALERT_THRESHOLD || 7);
const MISSED_HOURS = Number(process.env.MISSED_SESSION_HOURS || 48);

async function doctorAlerts(doctorId) {
  const patients = await prisma.patient.findMany({
    where: { doctorId },
    include: { sessions: { orderBy: { date: "desc" }, take: 5 } },
  });
  const alerts = [];
  const now = Date.now();
  for (const p of patients) {
    const recent = p.sessions[0];
    if (recent && recent.painLevel >= PAIN_THRESHOLD) {
      alerts.push({
        type: "high_pain",
        patientId: p.id,
        name: p.name,
        message: `High pain reported (${recent.painLevel}/10)`,
        at: recent.date,
      });
    }
    if (!recent || (now - new Date(recent.date).getTime()) / 36e5 > MISSED_HOURS) {
      alerts.push({
        type: "missed_sessions",
        patientId: p.id,
        name: p.name,
        message: `No session in last ${MISSED_HOURS}h`,
        at: recent?.date || null,
      });
    }
  }
  return alerts;
}

async function patientAlerts(patientId) {
  const sessions = await prisma.session.findMany({
    where: { patientId },
    orderBy: { date: "desc" },
    take: 3,
    include: { metrics: true },
  });
  const alerts = [];
  for (const s of sessions) {
    const overexerted = s.metrics.some((m) => m.speed > 250 || m.angle > 160);
    if (overexerted || s.fatigue) {
      alerts.push({
        type: "overexertion",
        sessionId: s.id,
        message: "Overexertion detected — reduce intensity",
        at: s.date,
      });
    }
  }
  return alerts;
}

module.exports = { doctorAlerts, patientAlerts };
