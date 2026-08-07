import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signTokens, verifyToken } from "../lib/jwt";
import { HttpError } from "../middleware/error";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const publicUser = { id: true, name: true, email: true, createdAt: true } as const;

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"),
});

// Personal app: only one account. Registration closes after the first user.
authRouter.post("/register", async (req, res) => {
  const body = registerSchema.parse(req.body);
  if ((await prisma.user.count()) > 0) {
    throw new HttpError(403, "নিবন্ধন বন্ধ আছে — এটি একটি ব্যক্তিগত অ্যাপ");
  }
  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email.toLowerCase(), passwordHash },
    select: publicUser,
  });
  res.status(201).json({ user, ...signTokens(user.id) });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

authRouter.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new HttpError(401, "ইমেইল বা পাসওয়ার্ড ভুল");
  }
  const { passwordHash: _ph, ...safe } = user;
  res.json({ user: safe, ...signTokens(user.id) });
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  const userId = verifyToken(refreshToken, "refresh");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(401, "ব্যবহারকারী পাওয়া যায়নি");
  res.json(signTokens(user.id));
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: publicUser });
  if (!user) throw new HttpError(404, "ব্যবহারকারী পাওয়া যায়নি");
  res.json({ user });
});
