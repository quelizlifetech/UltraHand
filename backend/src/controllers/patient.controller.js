const svc = require("../services/patient.service");

/* ---------------------------------------------------
   SAFE SERIALIZER
--------------------------------------------------- */
function sanitizePatient(patient) {
  if (!patient) return patient;

  return {
    ...patient,
    plans: Array.isArray(patient.plans)
      ? patient.plans.map((plan) => ({
          ...plan,
          aiReport: plan.aiReport || null,
        }))
      : [],
  };
}

/**
 * CREATE PATIENT (Doctor)
 * POST /api/patients
 */
exports.create = async (req, res) => {
  const data = await svc.createPatient(
    req.user.id,
    req.body
  );

  return res.status(201).json({
    success: true,
    message: "Patient created successfully",
    patient: sanitizePatient(data),
  });
};

/**
 * LIST ALL PATIENTS (Doctor)
 * GET /api/patients
 */
exports.list = async (req, res) => {
  const patients = await svc.listForDoctor(req.user.id);

  return res.json({
    success: true,
    count: patients.length,
    patients: patients.map(sanitizePatient),
  });
};

/**
 * GET SINGLE PATIENT (Doctor)
 * GET /api/patients/:id
 */
exports.getOne = async (req, res) => {
  const patient = await svc.getOne(
    req.user.id,
    req.params.id
  );

  return res.json({
    success: true,
    patient: sanitizePatient(patient),
  });
};

/**
 * UPDATE PATIENT (Doctor)
 * PUT /api/patients/:id
 */
exports.update = async (req, res) => {
  const patient = await svc.updatePatient(
    req.user.id,
    req.params.id,
    req.body
  );

  return res.json({
    success: true,
    message: "Patient updated successfully",
    patient: sanitizePatient(patient),
  });
};

/**
 * DELETE PATIENT (Doctor)
 * DELETE /api/patients/:id
 */
exports.remove = async (req, res) => {
  await svc.removePatient(req.user.id, req.params.id);

  return res.json({
    success: true,
    message: "Patient deleted successfully",
  });
};

/**
 * PATIENT SELF PROFILE
 * GET /api/patients/me
 */
exports.me = async (req, res) => {
  const patient = await svc.getByUserId(req.user.id);

  return res.json({
    success: true,
    patient: sanitizePatient(patient),
  });
};

/**
 * 🆕 UPDATE OWN PROFILE (Patient)
 * POST /api/patients/me/profile
 */
exports.updateOwnProfile = async (req, res) => {
  const user = await svc.updateOwnProfile(
    req.user.id,
    req.body
  );

  return res.json({
    success: true,
    message: "Profile updated",
    user,
  });
};

/**
 * 🆕 CHANGE OWN PASSWORD (Patient)
 * POST /api/patients/me/change-password
 */
exports.changeOwnPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await svc.changeOwnPassword(
    req.user.id,
    currentPassword,
    newPassword
  );

  return res.json({
    success: true,
    message: "Password changed successfully",
    ...result,
  });
};