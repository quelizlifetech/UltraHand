-- CreateEnum
CREATE TYPE "Role" AS ENUM ('doctor', 'patient');

-- CreateEnum
CREATE TYPE "HandSide" AS ENUM ('Left', 'Right', 'Both');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('Active', 'Recovering', 'Completed');

-- CreateEnum
CREATE TYPE "TherapyMode" AS ENUM ('Mechanical Stimulation', 'Passive', 'Assistive', 'Active');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('Scheduled', 'Completed', 'Skipped', 'InProgress');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "handSide" "HandSide" NOT NULL,
    "status" "PatientStatus" NOT NULL DEFAULT 'Active',
    "doctorId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TherapyConfig" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sessionsPerDay" INTEGER NOT NULL,
    "therapyMode" "TherapyMode" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "affectedJoints" TEXT[],
    "severityLevel" TEXT NOT NULL,

    CONSTRAINT "TherapyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaselineROM" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "index_mcp" DOUBLE PRECISION NOT NULL,
    "index_pip" DOUBLE PRECISION NOT NULL,
    "index_dip" DOUBLE PRECISION NOT NULL,
    "middle_mcp" DOUBLE PRECISION NOT NULL,
    "middle_pip" DOUBLE PRECISION NOT NULL,
    "middle_dip" DOUBLE PRECISION NOT NULL,
    "ring_mcp" DOUBLE PRECISION NOT NULL,
    "ring_pip" DOUBLE PRECISION NOT NULL,
    "ring_dip" DOUBLE PRECISION NOT NULL,
    "little_mcp" DOUBLE PRECISION NOT NULL,
    "little_pip" DOUBLE PRECISION NOT NULL,
    "little_dip" DOUBLE PRECISION NOT NULL,
    "thumb_mcp" DOUBLE PRECISION NOT NULL,
    "thumb_ip" DOUBLE PRECISION NOT NULL,
    "wrist_flexion" DOUBLE PRECISION NOT NULL,
    "wrist_extension" DOUBLE PRECISION NOT NULL,
    "wrist_radial_deviation" DOUBLE PRECISION NOT NULL,
    "wrist_ulnar_deviation" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BaselineROM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TherapyPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "intensity" TEXT NOT NULL,
    "repetitions" INTEGER NOT NULL,
    "targetROM" DOUBLE PRECISION NOT NULL,
    "aiReport" JSONB,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "totalDays" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dayInPlan" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'Completed',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "therapyMode" "TherapyMode",
    "avgROM" DOUBLE PRECISION,
    "recoveryPercent" DOUBLE PRECISION,
    "painLevel" INTEGER NOT NULL DEFAULT 0,
    "fatigue" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionMetric" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jointName" TEXT NOT NULL,
    "angle" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "targetAngle" DOUBLE PRECISION,
    "withinTarget" BOOLEAN,

    CONSTRAINT "SessionMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientId_key" ON "Patient"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TherapyConfig_patientId_key" ON "TherapyConfig"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "BaselineROM_patientId_key" ON "BaselineROM"("patientId");

-- CreateIndex
CREATE INDEX "TherapyPlan_patientId_idx" ON "TherapyPlan"("patientId");

-- CreateIndex
CREATE INDEX "Session_patientId_idx" ON "Session"("patientId");

-- CreateIndex
CREATE INDEX "Session_planId_idx" ON "Session"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_planId_dayInPlan_key" ON "Session"("planId", "dayInPlan");

-- CreateIndex
CREATE INDEX "SessionMetric_sessionId_idx" ON "SessionMetric"("sessionId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_receiverId_idx" ON "Message"("receiverId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyConfig" ADD CONSTRAINT "TherapyConfig_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaselineROM" ADD CONSTRAINT "BaselineROM_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyPlan" ADD CONSTRAINT "TherapyPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TherapyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMetric" ADD CONSTRAINT "SessionMetric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
