const svc = require("../services/message.service");
exports.send = async (req, res) =>
  res.status(201).json(await svc.send({ senderId: req.user.id, receiverId: req.body.receiverId, message: req.body.message }));
exports.thread = async (req, res) => res.json(await svc.thread(req.user.id, req.params.userId));
