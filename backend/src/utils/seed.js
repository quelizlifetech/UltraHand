/* Optional seed: one doctor + one patient. Run: npm run seed */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");

(async () => {
  const email = "doctor@ultrahand.dev";
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log("Already seeded.");
    return process.exit(0);
  }
  const doctor = await prisma.user.create({
    data: { name: "Dr. Mehta", email, password: await bcrypt.hash("password123", 10), role: "doctor" },
  });
  await prisma.patient.create({
    data: {
      patientId: "UH-1042",
      name: "Aarav Sharma",
      age: 34,
      diagnosis: "Distal radius fracture",
      category: "Post-surgical",
      handSide: "Right",
      doctorId: doctor.id,
      therapyConfig: {
        create: {
          sessionsPerDay: 2,
          therapyMode: "Active",
          durationMinutes: 20,
          affectedJoints: ["wrist_flexion", "index_pip"],
          severityLevel: "Moderate",
        },
      },
      baselineROM: {
        create: {
          index_mcp: 40, index_pip: 50, index_dip: 30,
          middle_mcp: 45, middle_pip: 55, middle_dip: 35,
          ring_mcp: 40, ring_pip: 50, ring_dip: 30,
          little_mcp: 35, little_pip: 45, little_dip: 25,
          thumb_mcp: 30, thumb_ip: 45,
          wrist_flexion: 35, wrist_extension: 30,
          wrist_radial_deviation: 10, wrist_ulnar_deviation: 15,
        },
      },
    },
  });
  console.log("Seeded doctor:", email, "/ password123");
  process.exit(0);
})();
