const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { authRouter } = require("./routes/auth");
const { clientsRouter } = require("./routes/clients");
const { projectsRouter } = require("./routes/projects");
const { tasksRouter } = require("./routes/tasks");
const { invoicesRouter } = require("./routes/invoices");
const { statsRouter } = require("./routes/stats");

const app = express();

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "project-manager-backend" });
});

app.use("/auth", authRouter);
app.use("/clients", clientsRouter);
app.use("/projects", projectsRouter);
app.use("/tasks", tasksRouter);
app.use("/invoices", invoicesRouter);
app.use("/stats", statsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = { app };
