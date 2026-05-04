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
      where: {
        patientId: candidate,
      },
    });

    if (!exists) return candidate;
  }

  throw new ApiError(
    500,
    "Could not generate patient ID"
  );
}

/* -------------------------------------------------- */
/* Create Patient */
/* -------------------------------------------------- */
async function createPatient(
  doctorId,
  payload
) {
  const {
    therapyConfig,
    baselineROM,
    account,
    ...patientData
  } = payload;

  const patientId =
    await uniquePatientId();

  let userId = null;

  /* -------------------------------
     Create Patient Login Account
  -------------------------------- */
  if (
    account &&
    account.phone &&
    account.phone.trim() !== ""
  ) {
    const phone =
      account.phone.trim();

    const exists =
      await prisma.user.findUnique({
        where: { phone },
      });

    if (exists) {
      throw new ApiError(
        409,
        "Phone number already registered"
      );
    }

    const defaultPassword =
      account.password || "12345";

    const hash =
      await bcrypt.hash(
        defaultPassword,
        10
      );

    const user =
      await prisma.user.create({
        data: {
          name: patientData.name,
          phone,
          password: hash,
          role: "patient",
          mustChangePassword: true,
        },
      });

    userId = user.id;
  }

  const patient =
    await prisma.patient.create({
      data: {
        ...patientData,
        patientId,
        doctorId,
        userId,

        therapyConfig: {
          create: therapyConfig,
        },

        baselineROM: {
          create: baselineROM,
        },
      },

      include: {
        therapyConfig: true,
        baselineROM: true,
        user: {
          select: {
            id: true,
            phone: true,
          },
        },
      },
    });

  return patient;
}

/* -------------------------------------------------- */
/* List Patients For Doctor */
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
      therapyConfig: true,
      user: {
        select: {
          phone: true,
        },
      },
    },
  });
}

/* -------------------------------------------------- */
/* Get Single Patient (Doctor) */
/* -------------------------------------------------- */
async function getOne(
  doctorId,
  id
) {
  const patient =
    await prisma.patient.findUnique({
      where: { id },

      include: {
        therapyConfig: true,
        baselineROM: true,

        plans: {
          orderBy: {
            createdAt: "desc",
          },
        },

        sessions: {
          orderBy: {
            date: "desc",
          },
          include: {
            metrics: true,
          },
        },

        user: {
          select: {
            phone: true,
            mustChangePassword: true,
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
    patient.doctorId !== doctorId
  ) {
    throw new ApiError(
      403,
      "Unauthorized access"
    );
  }

  return patient;
}

/* -------------------------------------------------- */
/* Get Logged In Patient Own Profile */
/* -------------------------------------------------- */
async function getByUserId(
  userId
) {
  const patient =
    await prisma.patient.findFirst({
      where: {
        userId,
      },

      include: {
        therapyConfig: true,
        baselineROM: true,

        plans: {
          orderBy: {
            createdAt: "desc",
          },
        },

        sessions: {
          orderBy: {
            date: "desc",
          },

          include: {
            metrics: true,
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
            mustChangePassword: true,
          },
        },
      },
    });

  if (!patient) {
    throw new ApiError(
      404,
      "Patient data not found"
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
    account,
    ...rest
  } = payload;

  const updated =
    await prisma.patient.update({
      where: { id },

      data: {
        ...rest,

        ...(therapyConfig && {
          therapyConfig: {
            upsert: {
              create:
                therapyConfig,
              update:
                therapyConfig,
            },
          },
        }),

        ...(baselineROM && {
          baselineROM: {
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
        therapyConfig: true,
        baselineROM: true,
      },
    });

  return updated;
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