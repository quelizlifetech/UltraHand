const svc = require("../services/patient.service");

/**
 * -----------------------------------
 * CREATE PATIENT (Doctor)
 * POST /api/patients
 * -----------------------------------
 */
exports.create = async (req, res) => {
  const data = await svc.createPatient(
    req.user.id,
    req.body
  );

  return res.status(201).json({
    success: true,
    message: "Patient created successfully",
    patient: data,
  });
};

/**
 * -----------------------------------
 * LIST ALL PATIENTS (Doctor)
 * GET /api/patients
 * -----------------------------------
 */
exports.list = async (req, res) => {
  const patients = await svc.listForDoctor(
    req.user.id
  );

  return res.json({
    success: true,
    count: patients.length,
    patients,
  });
};

/**
 * -----------------------------------
 * GET SINGLE PATIENT (Doctor)
 * GET /api/patients/:id
 * -----------------------------------
 */
exports.getOne = async (req, res) => {
  const patient = await svc.getOne(
    req.user.id,
    req.params.id
  );

  return res.json({
    success: true,
    patient,
  });
};

/**
 * -----------------------------------
 * UPDATE PATIENT (Doctor)
 * PUT /api/patients/:id
 * -----------------------------------
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
    patient,
  });
};

/**
 * -----------------------------------
 * DELETE PATIENT (Doctor)
 * DELETE /api/patients/:id
 * -----------------------------------
 */
exports.remove = async (req, res) => {
  await svc.removePatient(
    req.user.id,
    req.params.id
  );

  return res.json({
    success: true,
    message: "Patient deleted successfully",
  });
};

/**
 * -----------------------------------
 * PATIENT SELF PROFILE
 * GET /api/patients/me
 * -----------------------------------
 */
exports.me = async (req, res) => {
  const patient = await svc.getByUserId(
    req.user.id
  );

  return res.json({
    success: true,
    patient,
  });
};