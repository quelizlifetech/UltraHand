const svc = require("../services/session.service");
exports.start = async (req, res) => res.json(await svc.startSession(req.body.patientId));
exports.save = async (req, res) => res.status(201).json(await svc.saveSession(req.body));
exports.list = async (req, res) => res.json(await svc.listForPatient(req.params.patientId));
