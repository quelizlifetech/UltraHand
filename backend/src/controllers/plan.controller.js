const svc = require("../services/plan.service");

/* ---------------------------------------------------
   Create Manual Plan
--------------------------------------------------- */
exports.create = async (req, res) => {
  const plan = await svc.createPlan(
    req.user.id,
    req.body
  );

  return res.status(201).json({
    success: true,
    message: "Plan created successfully",
    plan,
  });
};

/* ---------------------------------------------------
   Get Single Plan
--------------------------------------------------- */
exports.getOne = async (req, res) => {
  const plan = await svc.getPlan(
    req.user.id,
    req.params.id
  );

  return res.json({
    success: true,
    plan,
  });
};

/* ---------------------------------------------------
   Update Plan
--------------------------------------------------- */
exports.update = async (req, res) => {
  const plan = await svc.updatePlan(
    req.user.id,
    req.params.id,
    req.body
  );

  return res.json({
    success: true,
    message: "Plan updated successfully",
    plan,
  });
};

/* ---------------------------------------------------
   Approve Plan
--------------------------------------------------- */
exports.approve = async (req, res) => {
  const plan = await svc.approvePlan(
    req.user.id,
    req.params.id
  );

  return res.json({
    success: true,
    message: "Plan approved successfully",
    plan,
  });
};

/* ---------------------------------------------------
   Finalize Plan
--------------------------------------------------- */
exports.finalize = async (req, res) => {
  const plan = await svc.finalizePlan(
    req.user.id,
    req.params.id
  );

  return res.json({
    success: true,
    message: "Plan finalized successfully",
    plan,
  });
};

/* ---------------------------------------------------
   Generate AI Plan
--------------------------------------------------- */
exports.generateAI = async (req, res) => {
  const plan =
    await svc.generateAIPlan(
      req.user.id,
      req.params.patientId
    );

  return res.status(201).json({
    success: true,
    message:
      "AI therapy plan generated successfully",
    plan,
  });
};