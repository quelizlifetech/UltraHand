const svc = require("../services/auth.service");

/* ----------------------------
   REGISTER DOCTOR
-----------------------------*/
exports.registerDoctor = async (req, res) => {
  const data = await svc.registerDoctor(req.body);
  res.status(201).json(data);
};

/* ----------------------------
   LOGIN
-----------------------------*/
exports.login = async (req, res) => {
  const data = await svc.login(req.body);
  res.json(data);
};

/* ----------------------------
   CURRENT USER
-----------------------------*/
exports.me = async (req, res) => {
  const user = await svc.me(req.user.id);
  res.json({ user });
};