import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./routes/auth";
import { itemsRouter } from "./routes/items";
import { rentersRouter } from "./routes/renters";
import { rentalsRouter } from "./routes/rentals";
import { paymentsRouter } from "./routes/payments";

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

app.use(errorHandler);
