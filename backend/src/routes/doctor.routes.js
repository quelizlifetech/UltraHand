const router = require("express").Router();
const ctrl = require("../controllers/doctor.controller");
const asyncHandler = require("../utils/asyncHandler");
const {
  authenticate,
  authorize,
} = require("../middleware/auth");

router.use(authenticate, authorize("doctor"));

/* GET /api/doctor/profile */
router.get(
  "/profile",
  asyncHandler(ctrl.getMyProfile)
);

/* POST /api/doctor/profile  (create or update) */
router.post(
  "/profile",
  asyncHandler(ctrl.updateProfile)
);

/* POST /api/doctor/change-password */
router.post(
  "/change-password",
  asyncHandler(ctrl.changePassword)
);

module.exports = router;