import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./routes/auth";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "bharar-hisab", time: new Date().toISOString() });
});

app.use("/api/v1/auth", authRouter);

app.use(errorHandler);
