const router = require("express").Router();
const ctrl = require("../controllers/progress.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);
router.get("/:patientId", asyncHandler(ctrl.get));

module.exports = router;
