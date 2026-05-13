const { z } = require("zod");

/* ------------------------------
   COMMON HELPERS
------------------------------ */
const angle = (min, max) =>
  z.coerce.number().min(min).max(max);

/* ------------------------------
   ML JOINTS SCHEMA
------------------------------ */
const jointsSchema = z.object({
  index_mcp: angle(0, 90),
  index_pip: angle(0, 110),
  index_dip: angle(0, 90),

  middle_mcp: angle(0, 90),
  middle_pip: angle(0, 110),
  middle_dip: angle(0, 90),

  ring_mcp: angle(0, 90),
  ring_pip: angle(0, 110),
  ring_dip: angle(0, 90),

  little_mcp: angle(0, 90),
  little_pip: angle(0, 110),
  little_dip: angle(0, 90),

  thumb_mcp: angle(0, 60),
  thumb_ip: angle(0, 90),

  wrist_flexion: angle(0, 90),
  wrist_extension: angle(0, 80),

  wrist_radial_dev: angle(0, 30),
  wrist_ulnar_dev: angle(0, 45),
});

/* ------------------------------
   ML INPUT SCHEMA
------------------------------ */
const mlInputSchema = z.object({
  therapy_mode: z.enum([
    "Active",
    "Passive",
    "Assistive",
    "Mechanical",
  ]),

  sessions_per_day: z.coerce.number().int().min(1).max(10),

  sessions_completed: z.coerce.number().int().min(0).max(100),

  session_duration: z.coerce.number().int().min(5).max(120),

  repetitions_completed: z.coerce.number().int().min(1).max(500),

  stiffness: z.coerce.number().int().min(1).max(5),

  joints: jointsSchema,
});

/* ------------------------------
   CREATE PATIENT
------------------------------ */
const createPatientSchema = z.object({
  name: z.string().trim().min(2).max(120),

  age: z.coerce.number().int().min(0).max(120),

  diagnosis: z.string().trim().min(2),

  category: z.string().trim().min(2),

  handSide: z.enum([
    "Left",
    "Right",
    "Both",
  ]),

  status: z.enum([
    "Active",
    "Recovering",
    "Completed",
  ]).optional(),

  ml_input: mlInputSchema,

  // Optional patient login account
  account: z.object({
    phone: z.string().min(10).max(15),
    password: z.string().min(5).default("12345"),
  }).optional(),
});

/* ------------------------------
   UPDATE PATIENT
------------------------------ */
const updatePatientSchema = createPatientSchema.partial();

/* ------------------------------
   THERAPY PLAN
------------------------------ */
const planSchema = z.object({
  patientId: z.string().min(1),

  intensity: z.enum([
    "Low",
    "Medium",
    "High",
  ]),

  repetitions: z.coerce.number().int().min(1).max(200),

  targetROM: z.coerce.number().min(0).max(180),
});

/* ------------------------------
   SESSION START
------------------------------ */
const sessionStartSchema = z.object({
  patientId: z.string().min(1),
});

/* ------------------------------
   SESSION SAVE
------------------------------ */
const sessionSaveSchema = z.object({
  patientId: z.string().min(1),

  painLevel: z.coerce.number().int().min(0).max(10),

  fatigue: z.boolean().optional().default(false),

  notes: z.string().max(2000).optional(),

  metrics: z.array(
    z.object({
      jointName: z.string().min(1),

      angle: z.coerce.number().min(0).max(180),

      speed: z.coerce.number().min(0).max(500),
    })
  ).min(1),
});

/* ------------------------------
   REGISTER DOCTOR
------------------------------ */
const registerDoctorSchema = z.object({
  name: z.string().min(2),

  email: z.string().email(),

  password: z.string().min(6),
});

/* ------------------------------
   LOGIN
------------------------------ */
const loginSchema = z.object({
  email: z.string().email().optional(),

  phone: z.string().min(10).max(15).optional(),

  password: z.string().min(1),
}).refine(
  (data) => data.email || data.phone,
  {
    message: "Email or phone is required",
    path: ["email"],
  }
);

module.exports = {
  jointsSchema,
  mlInputSchema,
  createPatientSchema,
  updatePatientSchema,
  planSchema,
  sessionStartSchema,
  sessionSaveSchema,
  registerDoctorSchema,
  loginSchema,
};