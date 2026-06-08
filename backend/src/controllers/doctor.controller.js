const svc = require("../services/doctor.service");

exports.getMyProfile = async (req, res) => {
  const data = await svc.getProfile(req.user.id);
  return res.json({ success: true, ...data });
};

exports.updateProfile = async (req, res) => {
  const profile = await svc.upsertProfile(
    req.user.id,
    req.body
  );
  return res.json({
    success: true,
    message: "Profile saved",
    profile,
  });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await svc.changePassword(
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