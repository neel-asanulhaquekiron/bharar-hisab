import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "bharar-hisab", time: new Date().toISOString() });
});

// API routes are mounted under /api/v1 as they are built (auth, items, renters, ...)

app.use(errorHandler);
