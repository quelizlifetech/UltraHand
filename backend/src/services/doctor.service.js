const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");

/* -------------------------------------------------- */
/* Get doctor profile + user info */
/* -------------------------------------------------- */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctorProfile: true },
  });

  if (!user) throw new ApiError(404, "User not found");
  if (user.role !== "doctor")
    throw new ApiError(403, "Not a doctor");

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    mustSetupProfile: user.mustSetupProfile,
    profile: user.doctorProfile || null,
  };
}

/* -------------------------------------------------- */
/* Create or update doctor profile (upsert) */
/* -------------------------------------------------- */
async function upsertProfile(userId, payload) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError(404, "User not found");
  if (user.role !== "doctor")
    throw new ApiError(403, "Not a doctor");

  const {
    username,
    firstName,
    lastName,
    occupation,
    profilePhoto,
    clinicName,
    clinicLocation,
    clinicTimings,
    phone,
  } = payload;

  // Required field validation
  if (!username || !firstName || !lastName) {
    throw new ApiError(
      400,
      "username, firstName, and lastName are required"
    );
  }

  if (!profilePhoto) {
    throw new ApiError(
      400,
      "Profile photo is required"
    );
  }

  // Username uniqueness check (allow self)
  const existingUsername =
    await prisma.doctorProfile.findFirst({
      where: {
        username,
        userId: { not: userId },
      },
    });

  if (existingUsername) {
    throw new ApiError(
      409,
      "Username already taken"
    );
  }

  // If phone is being updated, ensure uniqueness
  if (phone && phone !== user.phone) {
    const phoneExists = await prisma.user.findFirst({
      where: {
        phone,
        id: { not: userId },
      },
    });
    if (phoneExists) {
      throw new ApiError(
        409,
        "Phone number already in use"
      );
    }
  }

  // Upsert the profile + update user.phone + clear mustSetupProfile
  const result = await prisma.$transaction(async (tx) => {
    // Update User table (phone + mustSetupProfile)
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(phone !== undefined ? { phone } : {}),
        mustSetupProfile: false,
      },
    });

    // Upsert DoctorProfile
    const profile = await tx.doctorProfile.upsert({
      where: { userId },
      create: {
        userId,
        username,
        firstName,
        lastName,
        occupation: occupation || null,
        profilePhoto,
        clinicName: clinicName || null,
        clinicLocation: clinicLocation || null,
        clinicTimings: clinicTimings || null,
      },
      update: {
        username,
        firstName,
        lastName,
        occupation: occupation || null,
        profilePhoto,
        clinicName: clinicName || null,
        clinicLocation: clinicLocation || null,
        clinicTimings: clinicTimings || null,
      },
    });

    return profile;
  });

  return result;
}

/* -------------------------------------------------- */
/* Change password */
/* -------------------------------------------------- */
async function changePassword(
  userId,
  currentPassword,
  newPassword
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError(404, "User not found");

  // If user has mustChangePassword OR is doctor doing first setup,
  // skip current password check for doctor's first time
  // For now, always verify current password
  const ok = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!ok) {
    throw new ApiError(
      401,
      "Current password is incorrect"
    );
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
  getProfile,
  upsertProfile,
  changePassword,
};