const router = require("express").Router();
const ctrl = require("../controllers/patient.controller");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, authorize } = require("../middleware/auth");
const {
  createPatientSchema,
  updatePatientSchema,
} = require("../utils/validators");

/* --------------------------------------------------
   PATIENT SELF ROUTES
   Logged-in patient can fetch + update own profile
---------------------------------------------------*/
router.get(
  "/me",
  authenticate,
  authorize("patient"),
  asyncHandler(ctrl.me)
);

router.post(
  "/me/profile",
  authenticate,
  authorize("patient"),
  asyncHandler(ctrl.updateOwnProfile)
);

router.post(
  "/me/change-password",
  authenticate,
  authorize("patient"),
  asyncHandler(ctrl.changeOwnPassword)
);

/* --------------------------------------------------
   DOCTOR ROUTES
---------------------------------------------------*/
router.use(authenticate, authorize("doctor"));

router.post(
  "/",
  validate(createPatientSchema),
  asyncHandler(ctrl.create)
);

router.get("/", asyncHandler(ctrl.list));

router.get("/:id", asyncHandler(ctrl.getOne));

router.put(
  "/:id",
  validate(updatePatientSchema),
  asyncHandler(ctrl.update)
);

router.delete("/:id", asyncHandler(ctrl.remove));

module.exports = router;