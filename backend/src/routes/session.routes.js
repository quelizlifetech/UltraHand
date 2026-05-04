const router = require("express").Router();
const ctrl = require("../controllers/session.controller");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { sessionStartSchema, sessionSaveSchema } = require("../utils/validators");

router.use(authenticate);
router.post("/start", validate(sessionStartSchema), asyncHandler(ctrl.start));
router.post("/save", validate(sessionSaveSchema), asyncHandler(ctrl.save));
router.get("/:patientId", asyncHandler(ctrl.list));

module.exports = router;
