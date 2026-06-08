const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const generatePatientId = require("../utils/generatePatientId");

/* -------------------------------------------------- */
/* Generate Unique Patient ID */
/* -------------------------------------------------- */
async function uniquePatientId() {
  for (let i = 0; i < 5; i++) {
    const candidate = generatePatientId();
    const exists = await prisma.patient.findUnique({
      where: { patientId: candidate },
    });
    if (!exists) return candidate;
  }
  throw new ApiError(500, "Could not generate patient ID");
}

const clean = (val) =>
  typeof val === "string" ? val.trim() : val;

/* -------------------------------------------------- */
/* Sort plans: prefer ones with aiReport, then newest */
/* -------------------------------------------------- */
function sortPlansForDisplay(plans) {
  if (!Array.isArray(plans)) return [];
  return [...plans].sort((a, b) => {
    const aHasAI = !!a.aiReport;
    const bHasAI = !!b.aiReport;
    if (aHasAI && !bHasAI) return -1;
    if (!aHasAI && bHasAI) return 1;
    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  });
}

/* -------------------------------------------------- */
/* Create Patient */
/* -------------------------------------------------- */
async function createPatient(doctorId, payload) {
  const { ml_input, account, ...patientData } = payload;

  if (!ml_input) {
    throw new ApiError(400, "ml_input is required");
  }

  const cleanedPatientData = {
    name: clean(patientData.name),
    age: Number(patientData.age) || 1,
    diagnosis: clean(patientData.diagnosis),
    category: clean(patientData.category),
    handSide: ["Left", "Right", "Both"].includes(
      patientData.handSide
    )
      ? patientData.handSide
      : "Right",
  };

  const mode = clean(
    ml_input.therapy_mode || ""
  ).toLowerCase();

  let therapyMode = "Assistive";
  if (mode === "active") therapyMode = "Active";
  else if (mode === "passive") therapyMode = "Passive";
  else if (mode === "assistive") therapyMode = "Assistive";

  const therapyConfig = {
    sessionsPerDay: ml_input.sessions_per_day ?? 1,
    durationMinutes: ml_input.session_duration ?? 30,
    therapyMode,
    affectedJoints: ["All"],
    severityLevel: "Moderate",
  };

  const j = ml_input.joints || {};
  const baselineROM = {
    index_mcp: j.index_mcp ?? 0,
    index_pip: j.index_pip ?? 0,
    index_dip: j.index_dip ?? 0,
    middle_mcp: j.middle_mcp ?? 0,
    middle_pip: j.middle_pip ?? 0,
    middle_dip: j.middle_dip ?? 0,
    ring_mcp: j.ring_mcp ?? 0,
    ring_pip: j.ring_pip ?? 0,
    ring_dip: j.ring_dip ?? 0,
    little_mcp: j.little_mcp ?? 0,
    little_pip: j.little_pip ?? 0,
    little_dip: j.little_dip ?? 0,
    thumb_mcp: j.thumb_mcp ?? 0,
    thumb_ip: j.thumb_ip ?? 0,
    wrist_flexion: j.wrist_flexion ?? 0,
    wrist_extension: j.wrist_extension ?? 0,
    wrist_radial_deviation: j.wrist_radial_dev ?? 0,
    wrist_ulnar_deviation: j.wrist_ulnar_dev ?? 0,
  };

  const patientId = await uniquePatientId();
  let userId = null;

  if (
    account &&
    account.phone &&
    account.phone.trim() !== ""
  ) {
    const phone = account.phone.trim();

    const exists = await prisma.user.findUnique({
      where: { phone },
    });

    if (exists) {
      throw new ApiError(
        409,
        "Phone number already registered"
      );
    }

    const defaultPassword = account.password || "12345";
    const hash = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: cleanedPatientData.name,
        phone,
        password: hash,
        role: "patient",
        mustChangePassword: true,
      },
    });

    userId = user.id;
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        ...cleanedPatientData,
        patientId,
        doctorId,
        userId,
        therapyConfig: { create: therapyConfig },
        baselineROM: { create: baselineROM },
      },
      include: {
        therapyConfig: true,
        baselineROM: true,
        user: {
          select: { id: true, phone: true },
        },
      },
    });

    return patient;
  } catch (err) {
    console.error("🔥 REAL ERROR:", err.message);
    console.error("🔥 FULL ERROR:", err);
    console.error(
      "🔥 PAYLOAD:",
      JSON.stringify(payload, null, 2)
    );
    throw err;
  }
}

/* -------------------------------------------------- */
/* List Patients */
/* -------------------------------------------------- */
async function listForDoctor(doctorId) {
  const patients = await prisma.patient.findMany({
    where: { doctorId },
    orderBy: { createdAt: "desc" },
    include: {
      therapyConfig: true,
      user: {
        select: {
          phone: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      },
      plans: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          intensity: true,
          repetitions: true,
          targetROM: true,
          aiReport: true,
          isApproved: true,
          isFinalized: true,
          createdAt: true,
        },
      },
    },
  });

  return patients.map((p) => ({
    ...p,
    plans: sortPlansForDisplay(p.plans),
  }));
}

/* -------------------------------------------------- */
/* Get Single Patient */
/* -------------------------------------------------- */
async function getOne(doctorId, id) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      therapyConfig: true,
      baselineROM: true,
      plans: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          intensity: true,
          repetitions: true,
          targetROM: true,
          aiReport: true,
          isApproved: true,
          isFinalized: true,
          createdAt: true,
        },
      },
      sessions: {
        orderBy: { date: "desc" },
        include: { metrics: true },
      },
      user: {
        select: {
          phone: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          mustChangePassword: true,
        },
      },
    },
  });

  if (!patient) throw new ApiError(404, "Patient not found");
  if (patient.doctorId !== doctorId)
    throw new ApiError(403, "Unauthorized");

  patient.plans = sortPlansForDisplay(patient.plans);
  return patient;
}

/* -------------------------------------------------- */
/* Get Patient Self */
/* -------------------------------------------------- */
async function getByUserId(userId) {
  const patient = await prisma.patient.findFirst({
    where: { userId },
    include: {
      therapyConfig: true,
      baselineROM: true,
      plans: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          intensity: true,
          repetitions: true,
          targetROM: true,
          aiReport: true,
          isApproved: true,
          isFinalized: true,
          createdAt: true,
        },
      },
      sessions: {
        orderBy: { date: "desc" },
        include: { metrics: true },
      },
      doctor: {
        select: { id: true, name: true, email: true },
      },
      user: {
        select: {
          id: true,
          phone: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          mustChangePassword: true,
        },
      },
    },
  });

  if (!patient) throw new ApiError(404, "Patient not found");

  patient.plans = sortPlansForDisplay(patient.plans);
  return patient;
}

/* -------------------------------------------------- */
/* Update Patient (Doctor) */
/* -------------------------------------------------- */
async function updatePatient(doctorId, id, payload) {
  await getOne(doctorId, id);

  const { therapyConfig, baselineROM, ...rest } = payload;

  return prisma.patient.update({
    where: { id },
    data: {
      ...rest,
      ...(therapyConfig && {
        therapyConfig: {
          upsert: {
            create: therapyConfig,
            update: therapyConfig,
          },
        },
      }),
      ...(baselineROM && {
        baselineROM: {
          upsert: {
            create: baselineROM,
            update: baselineROM,
          },
        },
      }),
    },
    include: {
      therapyConfig: true,
      baselineROM: true,
    },
  });
}

/* -------------------------------------------------- */
/* Delete Patient */
/* -------------------------------------------------- */
async function removePatient(doctorId, id) {
  const patient = await getOne(doctorId, id);

  if (patient.userId) {
    await prisma.user.delete({
      where: { id: patient.userId },
    });
  }

  await prisma.patient.delete({ where: { id } });
  return { success: true };
}

/* ============================================================
   🆕 PATIENT SELF — PROFILE UPDATE
   ============================================================ */
async function updateOwnProfile(userId, payload) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError(404, "User not found");
  if (user.role !== "patient")
    throw new ApiError(403, "Not a patient");

  const {
    firstName,
    lastName,
    email,
    phone,
    profilePhoto,
  } = payload;

  // Validate email uniqueness if provided
  if (email && email !== user.email) {
    const exists = await prisma.user.findFirst({
      where: { email, id: { not: userId } },
    });
    if (exists) throw new ApiError(409, "Email already in use");
  }

  // Validate phone uniqueness if provided
  if (phone && phone !== user.phone) {
    const exists = await prisma.user.findFirst({
      where: { phone, id: { not: userId } },
    });
    if (exists)
      throw new ApiError(409, "Phone number already in use");
  }

  // Compose updated Patient.name from first+last if provided
  let composedName;
  if (firstName || lastName) {
    composedName = [firstName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Update User fields
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(profilePhoto !== undefined ? { profilePhoto } : {}),
        ...(composedName ? { name: composedName } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
    });

    // Also update Patient.name if we composed a new name
    if (composedName) {
      await tx.patient.updateMany({
        where: { userId },
        data: { name: composedName },
      });
    }

    return updatedUser;
  });

  return updated;
}

/* ============================================================
   🆕 PATIENT SELF — CHANGE PASSWORD
   ============================================================ */
async function changeOwnPassword(
  userId,
  currentPassword,
  newPassword
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError(404, "User not found");

  const ok = await bcrypt.compare(currentPassword, user.password);

  if (!ok) {
    throw new ApiError(401, "Current password is incorrect");
  }

  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(
      400,
      "New password must be at least 8 characters"
    );
  }

  if (newPassword === currentPassword) {
    throw new ApiError(
      400,
      "New password must be different from current password"
    );
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hash,
      mustChangePassword: false,
    },
  });

  return { success: true };
}

module.exports = {
  createPatient,
  listForDoctor,
  getOne,
  getByUserId,
  updatePatient,
  removePatient,
  updateOwnProfile,
  changeOwnPassword,
};