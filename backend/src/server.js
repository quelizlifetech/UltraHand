require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const planRoutes = require("./routes/plan.routes");
const sessionRoutes = require("./routes/session.routes");
const progressRoutes = require("./routes/progress.routes");
const alertRoutes = require("./routes/alert.routes");
const messageRoutes = require("./routes/message.routes");
const doctorRoutes = require("./routes/doctor.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "ultrahand-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/doctor", doctorRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`UltraHand backend running on :${PORT}`));