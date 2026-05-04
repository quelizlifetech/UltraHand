const svc = require("../services/alert.service");
exports.doctor = async (req, res) => res.json(await svc.doctorAlerts(req.user.id));
exports.patient = async (req, res) => res.json(await svc.patientAlerts(req.params.patientId));
