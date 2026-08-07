import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/error";
import { requireAuth } from "../middleware/auth";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

const createSchema = z.object({
  rentalId: z.string().uuid(),
  amount: z.number().positive(),
  paidAt: z.coerce.date().optional(),
  method: z.string().nullish(),
  notes: z.string().nullish(),
});

paymentsRouter.post("/", async (req, res) => {
  const body = createSchema.parse(req.body);
  const rental = await prisma.rental.findFirst({
    where: { id: body.rentalId, userId: req.userId },
  });
  if (!rental) throw new HttpError(404, "ভাড়ার রেকর্ড পাওয়া যায়নি");
  const payment = await prisma.payment.create({
    data: {
      rentalId: rental.id,
      amount: body.amount,
      paidAt: body.paidAt ?? new Date(),
      method: body.method ?? null,
      notes: body.notes ?? null,
    },
  });
  res.status(201).json({ payment });
});

const listSchema = z.object({
  rentalId: z.string().uuid().optional(),
  renterId: z.string().uuid().optional(),
});

paymentsRouter.get("/", async (req, res) => {
  const query = listSchema.parse(req.query);
  const payments = await prisma.payment.findMany({
    where: {
      rental: { userId: req.userId, id: query.rentalId, renterId: query.renterId },
    },
    orderBy: { paidAt: "desc" },
    include: {
      rental: {
        select: {
          id: true,
          item: { select: { name: true } },
          renter: { select: { id: true, name: true } },
        },
      },
    },
  });
  res.json({ payments });
});

paymentsRouter.delete("/:id", async (req, res) => {
  const payment = await prisma.payment.findFirst({
    where: { id: req.params.id, rental: { userId: req.userId } },
  });
  if (!payment) throw new HttpError(404, "পেমেন্ট পাওয়া যায়নি");
  await prisma.payment.delete({ where: { id: payment.id } });
  res.json({ ok: true });
});
