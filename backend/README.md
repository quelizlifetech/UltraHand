# UltraHand Backend

Production-grade Express + Prisma + PostgreSQL backend for the UltraHand AI-powered Hand Therapy System.

> No ML logic included — the therapy plan flow is fully manual (create → approve → finalize). ML can be plugged into `services/plan.service.js` later.

## Tech

- Node.js + Express
- PostgreSQL + Prisma ORM
- JWT auth (doctor / patient roles)
- bcryptjs, helmet, cors, morgan
- Zod validation

## Folder structure

```
src/
  routes/         # HTTP routing only
  controllers/    # Thin: parse req → call service → return res
  services/       # All business logic
  middleware/     # auth, validate, errorHandler
  utils/          # jwt, validators, helpers, seed
  prisma/         # Prisma client singleton
  server.js
prisma/
  schema.prisma
```

## Setup

1. Install deps
   ```bash
   npm install
   ```

2. Start PostgreSQL and create a DB:
   ```bash
   createdb ultrahand
   ```

3. Configure env:
   ```bash
   cp .env.example .env
   # edit DATABASE_URL and JWT_SECRET
   ```

4. Run migrations + generate client:
   ```bash
   npm run prisma:migrate
   ```

5. (Optional) Seed a doctor + patient:
   ```bash
   npm run seed
   # doctor@ultrahand.dev / password123
   ```

6. Run dev server:
   ```bash
   npm run dev
   ```

   Server: http://localhost:4000

## Auth model

- `POST /api/auth/register-doctor` — creates a doctor account (only role allowed via self-registration).
- `POST /api/auth/login` — returns JWT for doctor or patient.
- Patients are created **only** by doctors (`POST /api/patients` with optional `account` block to create their login).

Send JWT as `Authorization: Bearer <token>`.

## API endpoints

### Auth
| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/register-doctor` | `{ name, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET  | `/api/auth/me` | — |

### Patients (doctor only)
| Method | Path |
|---|---|
| POST | `/api/patients` |
| GET  | `/api/patients` |
| GET  | `/api/patients/:id` |
| PUT  | `/api/patients/:id` |
| DELETE | `/api/patients/:id` |

### Therapy Plans (doctor only)
| Method | Path | Notes |
|---|---|---|
| POST | `/api/plans` | Created with `isApproved=false`, `isFinalized=false` |
| PUT  | `/api/plans/:id` | Cannot edit a finalized plan |
| POST | `/api/plans/:id/approve` | |
| POST | `/api/plans/:id/finalize` | Requires approval |

### Sessions (doctor or patient)
| Method | Path | Notes |
|---|---|---|
| POST | `/api/sessions/start` | Requires a finalized plan |
| POST | `/api/sessions/save` | Stores session + per-joint metrics |
| GET  | `/api/sessions/:patientId` | |

### Progress
- `GET /api/progress/:patientId` → `{ actual: [...], predicted: [...] }`
  - improvement % = `(currentROM - baselineROM) / baselineROM * 100`
  - `predicted` is mock placeholder until ML lands.

### Alerts
- `GET /api/alerts/doctor` — high pain (≥ threshold) + missed sessions
- `GET /api/alerts/patient/:patientId` — overexertion (high speed/angle or fatigue)

### Messages
- `POST /api/messages` `{ receiverId, message }`
- `GET /api/messages/:userId` thread

## Sample requests

### Register doctor
```http
POST /api/auth/register-doctor
{ "name": "Dr. Mehta", "email": "doc@ex.com", "password": "secret123" }

→ 201
{ "user": { "id": "...", "name": "Dr. Mehta", "email": "doc@ex.com", "role": "doctor" },
  "token": "eyJhbGciOi..." }
```

### Create patient (with config + baseline + login account)
```http
POST /api/patients
Authorization: Bearer <doctor-jwt>

{
  "name": "Aarav Sharma", "age": 34, "diagnosis": "Distal radius fracture",
  "category": "Post-surgical", "handSide": "Right", "status": "Active",
  "therapyConfig": {
    "sessionsPerDay": 2, "therapyMode": "Active", "durationMinutes": 20,
    "affectedJoints": ["wrist_flexion","index_pip"], "severityLevel": "Moderate"
  },
  "baselineROM": {
    "index_mcp": 40, "index_pip": 50, "index_dip": 30,
    "middle_mcp": 45, "middle_pip": 55, "middle_dip": 35,
    "ring_mcp": 40, "ring_pip": 50, "ring_dip": 30,
    "little_mcp": 35, "little_pip": 45, "little_dip": 25,
    "thumb_mcp": 30, "thumb_ip": 45,
    "wrist_flexion": 35, "wrist_extension": 30,
    "wrist_radial_deviation": 10, "wrist_ulnar_deviation": 15
  },
  "account": { "email": "aarav@ex.com", "password": "patientpass" }
}
```

### Plan lifecycle
```http
POST /api/plans
{ "patientId":"<id>", "intensity":"Medium", "repetitions":12, "targetROM":70 }

POST /api/plans/<id>/approve
POST /api/plans/<id>/finalize
```

### Save session
```http
POST /api/sessions/save
{
  "patientId":"<id>",
  "painLevel": 3,
  "fatigue": false,
  "notes": "Felt smoother today",
  "metrics": [
    { "jointName":"wrist_flexion", "angle": 42, "speed": 90 },
    { "jointName":"index_pip", "angle": 60, "speed": 70 }
  ]
}
```

## Validation

- ROM angles enforced to realistic ranges per joint (see `utils/validators.js`).
- Pain level 0–10, sessions per day 1–8, duration 5–120 min.
- Plan cannot be finalized without prior approval.
- Sessions cannot be started/saved unless a finalized plan exists.
- Doctors can only access their own patients.

## Security

- Passwords hashed with bcrypt (10 rounds).
- JWT-protected routes via `middleware/auth.js`.
- `helmet`, `cors`, JSON body limit.
- Role middleware (`authorize("doctor")`) on doctor-only routes.
