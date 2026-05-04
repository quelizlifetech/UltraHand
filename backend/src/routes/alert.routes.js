const router = require("express").Router();
const ctrl = require("../controllers/alert.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, authorize } = require("../middleware/auth");

router.get("/doctor", authenticate, authorize("doctor"), asyncHandler(ctrl.doctor));
router.get("/patient/:patientId", authenticate, asyncHandler(ctrl.patient));

module.exports = router;
