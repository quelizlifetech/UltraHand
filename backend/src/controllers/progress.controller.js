const svc = require("../services/progress.service");
exports.get = async (req, res) => res.json(await svc.getProgress(req.params.patientId));
