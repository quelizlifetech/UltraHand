const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const { sign } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

/* ----------------------------
   REGISTER DOCTOR
-----------------------------*/
async function registerDoctor({ name, email, password }) {
  const existing = await prisma.user.findFirst({
    where: { email },
  });

  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: "doctor",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      mustChangePassword: true,
    },
  });

  const token = sign({
    id: user.id,
    role: user.role,
    email: user.email,
  });

  return { user, token };
}

/* ----------------------------
   LOGIN
   Doctor -> email
   Patient -> phone
-----------------------------*/
async function login({ email, phone, password }) {
  let user = null;

  if (email) {
    user = await prisma.user.findFirst({
      where: { email },
      include: {
        patientProfile: true,
      },
    });
  } else if (phone) {
    user = await prisma.user.findFirst({
      where: { phone },
      include: {
        patientProfile: true,
      },
    });
  }

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = sign({
    id: user.id,
    role: user.role,
    email: user.email,
    phone: user.phone,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      patientId: user.patientProfile ? user.patientProfile.id : null,
    },
    token,
  };
}

/* ----------------------------
   GET CURRENT USER
-----------------------------*/
async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    patientId: user.patientProfile ? user.patientProfile.id : null,
  };
}

module.exports = {
  registerDoctor,
  login,
  me,
};