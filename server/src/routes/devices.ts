import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendPushToUser } from "../lib/push";
import { requireAuth } from "../middleware/auth";

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

const registerSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.string().default("android"),
});

devicesRouter.post("/", async (req, res) => {
  const body = registerSchema.parse(req.body);
  const device = await prisma.deviceToken.upsert({
    where: { fcmToken: body.fcmToken },
    create: { userId: req.userId, fcmToken: body.fcmToken, platform: body.platform },
    update: { userId: req.userId, platform: body.platform },
  });
  res.status(201).json({ device });
});

devicesRouter.delete("/", async (req, res) => {
  const body = z.object({ fcmToken: z.string().min(1) }).parse(req.body);
  await prisma.deviceToken.deleteMany({
    where: { userId: req.userId, fcmToken: body.fcmToken },
  });
  res.json({ ok: true });
});

// Sends a test notification to the caller's registered devices so push can
// be verified from the phone without waiting for the daily reminder.
devicesRouter.post("/test", async (req, res) => {
  const sent = await sendPushToUser(
    req.userId,
    "ভাড়ার হিসাব",
    "নোটিফিকেশন চালু আছে ✅",
    { url: "/" },
  );
  res.json({ sent });
});
