const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const generatePatientId = require("../utils/generatePatientId");

/* -------------------------------------------------- */
/* Generate Unique Patient ID */
/* -------------------------------------------------- */
async function uniquePatientId() {
  for (let i = 0; i < 5; i++) {
    const candidate =
      generatePatientId();

    const exists =
      await prisma.patient.findUnique({
        where: {
          patientId:
            candidate,
        },
      });

    if (!exists)
      return candidate;
  }

  throw new ApiError(
    500,
    "Could not generate patient ID"
  );
}

/* -------------------------------------------------- */
/* Helper: Clean Strings */
/* -------------------------------------------------- */
const clean = (val) =>
  typeof val === "string"
    ? val.trim()
    : val;

/* -------------------------------------------------- */
/* Create Patient */
/* -------------------------------------------------- */
async function createPatient(
  doctorId,
  payload
) {
  const {
    ml_input,
    account,
    ...patientData
  } = payload;

  if (!ml_input) {
    throw new ApiError(
      400,
      "ml_input is required"
    );
  }

  /* --------------------------------------------------
     CLEAN PATIENT DATA
  -------------------------------------------------- */

  const cleanedPatientData =
    {
      name: clean(
        patientData.name
      ),

      age:
        Number(
          patientData.age
        ) || 1,

      diagnosis: clean(
        patientData.diagnosis
      ),

      category: clean(
        patientData.category
      ),

      handSide: [
        "Left",
        "Right",
        "Both",
      ].includes(
        patientData.handSide
      )
        ? patientData.handSide
        : "Right",
    };

  /* --------------------------------------------------
     NORMALIZE THERAPY MODE
  -------------------------------------------------- */

  const mode = clean(
    ml_input.therapy_mode ||
      ""
  ).toLowerCase();

  let therapyMode =
    "Assistive";

  if (mode === "active") {
    therapyMode =
      "Active";
  } else if (
    mode === "passive"
  ) {
    therapyMode =
      "Passive";
  } else if (
    mode === "assistive"
  ) {
    therapyMode =
      "Assistive";
  }

  /* --------------------------------------------------
     THERAPY CONFIG
  -------------------------------------------------- */

  const therapyConfig = {
    sessionsPerDay:
      ml_input.sessions_per_day ??
      1,

    durationMinutes:
      ml_input.session_duration ??
      30,

    therapyMode,

    affectedJoints: [
      "All",
    ],

    severityLevel:
      "Moderate",
  };

  /* --------------------------------------------------
     JOINTS
  -------------------------------------------------- */

  const j =
    ml_input.joints || {};

  const baselineROM = {
    index_mcp:
      j.index_mcp ?? 0,

    index_pip:
      j.index_pip ?? 0,

    index_dip:
      j.index_dip ?? 0,

    middle_mcp:
      j.middle_mcp ?? 0,

    middle_pip:
      j.middle_pip ?? 0,

    middle_dip:
      j.middle_dip ?? 0,

    ring_mcp:
      j.ring_mcp ?? 0,

    ring_pip:
      j.ring_pip ?? 0,

    ring_dip:
      j.ring_dip ?? 0,

    little_mcp:
      j.little_mcp ?? 0,

    little_pip:
      j.little_pip ?? 0,

    little_dip:
      j.little_dip ?? 0,

    thumb_mcp:
      j.thumb_mcp ?? 0,

    thumb_ip:
      j.thumb_ip ?? 0,

    wrist_flexion:
      j.wrist_flexion ??
      0,

    wrist_extension:
      j.wrist_extension ??
      0,

    wrist_radial_deviation:
      j.wrist_radial_dev ??
      0,

    wrist_ulnar_deviation:
      j.wrist_ulnar_dev ??
      0,
  };

  const patientId =
    await uniquePatientId();

  let userId = null;

  /* --------------------------------------------------
     CREATE PATIENT LOGIN
  -------------------------------------------------- */

  if (
    account &&
    account.phone &&
    account.phone.trim() !==
      ""
  ) {
    const phone =
      account.phone.trim();

    const exists =
      await prisma.user.findUnique({
        where: {
          phone,
        },
      });

    if (exists) {
      throw new ApiError(
        409,
        "Phone number already registered"
      );
    }

    const defaultPassword =
      account.password ||
      "12345";

    const hash =
      await bcrypt.hash(
        defaultPassword,
        10
      );

    const user =
      await prisma.user.create({
        data: {
          name: cleanedPatientData.name,

          phone,

          password:
            hash,

          role:
            "patient",

          mustChangePassword:
            true,
        },
      });

    userId = user.id;
  }

  /* --------------------------------------------------
     CREATE PATIENT
  -------------------------------------------------- */

  try {
    const patient =
      await prisma.patient.create({
        data: {
          ...cleanedPatientData,

          patientId,

          doctorId,

          userId,

          therapyConfig:
            {
              create:
                therapyConfig,
            },

          baselineROM:
            {
              create:
                baselineROM,
            },
        },

        include: {
          therapyConfig:
            true,

          baselineROM:
            true,

          user: {
            select: {
              id: true,
              phone: true,
            },
          },
        },
      });

    return patient;
  } catch (err) {
    console.error(
      "🔥 REAL ERROR:",
      err.message
    );

    console.error(
      "🔥 FULL ERROR:",
      err
    );

    console.error(
      "🔥 PAYLOAD:",
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    throw err;
  }
}

/* -------------------------------------------------- */
/* List Patients */
/* -------------------------------------------------- */
async function listForDoctor(
  doctorId
) {
  return prisma.patient.findMany({
    where: {
      doctorId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      therapyConfig:
        true,

      user: {
        select: {
          phone: true,
        },
      },

      plans: {
        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          id: true,
          intensity:
            true,
          repetitions:
            true,
          targetROM:
            true,
          aiReport:
            true,
          createdAt:
            true,
        },
      },
    },
  });
}

/* -------------------------------------------------- */
/* Get Single Patient */
/* -------------------------------------------------- */
async function getOne(
  doctorId,
  id
) {
  const patient =
    await prisma.patient.findUnique({
      where: { id },

      include: {
        therapyConfig:
          true,

        baselineROM:
          true,

        plans: {
          orderBy: {
            createdAt:
              "desc",
          },

          select: {
            id: true,

            intensity:
              true,

            repetitions:
              true,

            targetROM:
              true,

            aiReport:
              true,

            isApproved:
              true,

            isFinalized:
              true,

            createdAt:
              true,
          },
        },

        sessions: {
          orderBy: {
            date: "desc",
          },

          include: {
            metrics:
              true,
          },
        },

        user: {
          select: {
            phone: true,

            mustChangePassword:
              true,
          },
        },
      },
    });

  if (!patient) {
    throw new ApiError(
      404,
      "Patient not found"
    );
  }

  if (
    patient.doctorId !==
    doctorId
  ) {
    throw new ApiError(
      403,
      "Unauthorized"
    );
  }

  return patient;
}

/* -------------------------------------------------- */
/* Get Patient Self
/* -------------------------------------------------- */
async function getByUserId(
  userId
) {
  const patient =
    await prisma.patient.findFirst({
      where: { userId },

      include: {
        therapyConfig:
          true,

        baselineROM:
          true,

        plans: {
          orderBy: {
            createdAt:
              "desc",
          },

          select: {
            id: true,

            intensity:
              true,

            repetitions:
              true,

            targetROM:
              true,

            aiReport:
              true,

            isApproved:
              true,

            isFinalized:
              true,

            createdAt:
              true,
          },
        },

        sessions: {
          orderBy: {
            date: "desc",
          },

          include: {
            metrics:
              true,
          },
        },

        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        user: {
          select: {
            id: true,
            phone: true,

            mustChangePassword:
              true,
          },
        },
      },
    });

  if (!patient) {
    throw new ApiError(
      404,
      "Patient not found"
    );
  }

  return patient;
}

/* -------------------------------------------------- */
/* Update Patient */
/* -------------------------------------------------- */
async function updatePatient(
  doctorId,
  id,
  payload
) {
  await getOne(
    doctorId,
    id
  );

  const {
    therapyConfig,
    baselineROM,
    ...rest
  } = payload;

  return prisma.patient.update({
    where: { id },

    data: {
      ...rest,

      ...(therapyConfig && {
        therapyConfig:
          {
            upsert: {
              create:
                therapyConfig,

              update:
                therapyConfig,
            },
          },
      }),

      ...(baselineROM && {
        baselineROM:
          {
            upsert: {
              create:
                baselineROM,

              update:
                baselineROM,
            },
          },
      }),
    },

    include: {
      therapyConfig:
        true,

      baselineROM:
        true,
    },
  });
}

/* -------------------------------------------------- */
/* Delete Patient */
/* -------------------------------------------------- */
async function removePatient(
  doctorId,
  id
) {
  const patient =
    await getOne(
      doctorId,
      id
    );

  if (patient.userId) {
    await prisma.user.delete({
      where: {
        id: patient.userId,
      },
    });
  }

  await prisma.patient.delete({
    where: { id },
  });

  return {
    success: true,
  };
}

module.exports = {
  createPatient,
  listForDoctor,
  getOne,
  getByUserId,
  updatePatient,
  removePatient,
};