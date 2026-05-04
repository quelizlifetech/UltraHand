const router = require("express").Router();

const ctrl = require("../controllers/plan.controller");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const {
  planSchema,
} = require("../utils/validators");

/* ---------------------------------------------------
   Only doctors can manage plans
--------------------------------------------------- */
router.use(
  authenticate,
  authorize("doctor")
);

/* ---------------------------------------------------
   Generate AI Plan
   POST /api/plans/generate-ai/:patientId
--------------------------------------------------- */
router.post(
  "/generate-ai/:patientId",
  asyncHandler(
    ctrl.generateAI
  )
);

/* ---------------------------------------------------
   Manual Create Plan
   POST /api/plans
--------------------------------------------------- */
router.post(
  "/",
  validate(
    planSchema
  ),
  asyncHandler(
    ctrl.create
  )
);

/* ---------------------------------------------------
   Get Single Plan
   GET /api/plans/:id
--------------------------------------------------- */
router.get(
  "/:id",
  asyncHandler(
    ctrl.getOne
  )
);

/* ---------------------------------------------------
   Update Plan
   PUT /api/plans/:id
--------------------------------------------------- */
router.put(
  "/:id",
  asyncHandler(
    ctrl.update
  )
);

/* ---------------------------------------------------
   Approve Plan
   POST /api/plans/:id/approve
--------------------------------------------------- */
router.post(
  "/:id/approve",
  asyncHandler(
    ctrl.approve
  )
);

/* ---------------------------------------------------
   Finalize Plan
   POST /api/plans/:id/finalize
--------------------------------------------------- */
router.post(
  "/:id/finalize",
  asyncHandler(
    ctrl.finalize
  )
);

module.exports = router;