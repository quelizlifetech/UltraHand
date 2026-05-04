const router = require("express").Router();
const ctrl = require("../controllers/message.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);
router.post("/", asyncHandler(ctrl.send));
router.get("/:userId", asyncHandler(ctrl.thread));

module.exports = router;
