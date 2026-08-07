import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./routes/auth";
import { itemsRouter } from "./routes/items";
import { rentersRouter } from "./routes/renters";
import { rentalsRouter } from "./routes/rentals";
import { paymentsRouter } from "./routes/payments";
import { dashboardRouter } from "./routes/dashboard";
import { devicesRouter } from "./routes/devices";
import { runDueReminders } from "./jobs/reminders";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "bharar-hisab", time: new Date().toISOString() });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/items", itemsRouter);
app.use("/api/v1/renters", rentersRouter);
app.use("/api/v1/rentals", rentalsRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/devices", devicesRouter);

// External cron trigger (e.g. cron-job.org) — free-tier hosts sleep when
// idle, so the in-process scheduler alone would miss the daily reminder.
app.post("/api/v1/cron/reminders", async (req, res) => {
  const key = req.headers["x-cron-key"] ?? req.query.key;
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  await runDueReminders();
  res.json({ ok: true });
});

app.use(errorHandler);
