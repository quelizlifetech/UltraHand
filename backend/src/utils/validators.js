const { z } = require("zod");

/* ------------------------------
   COMMON HELPERS
------------------------------ */
const angle = (min, max) => z.number().min(min).max(max);

/* ------------------------------
   BASELINE ROM
------------------------------ */
const baselineROMSchema = z.object({
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
  wrist_radial_deviation: angle(0, 25),
  wrist_ulnar_deviation: angle(0, 40),
});

/* ------------------------------
   THERAPY CONFIG
------------------------------ */
const therapyConfigSchema = z.object({
  sessionsPerDay: z.number().int().min(1).max(8),

  therapyMode: z.enum([
    "Active",
    "Passive",
    "Assisted",
  ]),

  durationMinutes: z.number().int().min(5).max(120),

  affectedJoints: z.array(z.string().min(1)).min(1),

  severityLevel: z.enum([
    "Mild",
    "Moderate",
    "Severe",
  ]),
});

/* ------------------------------
   CREATE PATIENT
------------------------------ */
const createPatientSchema = z.object({
  name: z.string().min(2).max(120),

  age: z.number().int().min(0).max(120),

  diagnosis: z.string().min(2),

  category: z.string().min(2),

  handSide: z.enum([
    "Left",
    "Right",
  ]),

  status: z.enum([
    "Active",
    "Recovering",
    "Completed",
  ]).optional(),

  therapyConfig: therapyConfigSchema,

  baselineROM: baselineROMSchema,

  // Optional patient login account
  account: z.object({
    phone: z.string().min(10).max(15),
    password: z.string().min(5).default("12345"),
  }).optional(),
});

/* ------------------------------
   UPDATE PATIENT
------------------------------ */
const updatePatientSchema = createPatientSchema.partial().extend({
  therapyConfig: therapyConfigSchema.partial().optional(),
  baselineROM: baselineROMSchema.partial().optional(),
});

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

  repetitions: z.number().int().min(1).max(200),

  targetROM: z.number().min(0).max(180),
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

  painLevel: z.number().int().min(0).max(10),

  fatigue: z.boolean().optional().default(false),

  notes: z.string().max(2000).optional(),

  metrics: z.array(
    z.object({
      jointName: z.string().min(1),
      angle: z.number().min(0).max(180),
      speed: z.number().min(0).max(500),
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
   Doctor => email
   Patient => phone
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
  baselineROMSchema,
  therapyConfigSchema,
  createPatientSchema,
  updatePatientSchema,
  planSchema,
  sessionStartSchema,
  sessionSaveSchema,
  registerDoctorSchema,
  loginSchema,
};