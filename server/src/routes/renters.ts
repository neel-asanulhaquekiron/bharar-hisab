import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { rentalFinancials } from "../lib/billing";
import { HttpError } from "../middleware/error";
import { requireAuth } from "../middleware/auth";

export const rentersRouter = Router();
rentersRouter.use(requireAuth);

const renterSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  notes: z.string().nullish(),
});

rentersRouter.get("/", async (req, res) => {
  const renters = await prisma.renter.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rentals: { where: { status: { not: "RETURNED" } } } } } },
  });
  res.json({
    renters: renters.map(({ _count, ...r }) => ({ ...r, activeRentals: _count.rentals })),
  });
});

rentersRouter.post("/", async (req, res) => {
  const body = renterSchema.parse(req.body);
  const renter = await prisma.renter.create({ data: { ...body, userId: req.userId } });
  res.status(201).json({ renter });
});

rentersRouter.get("/:id", async (req, res) => {
  const renter = await prisma.renter.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!renter) throw new HttpError(404, "ভাড়াটিয়া পাওয়া যায়নি");
  res.json({ renter });
});

rentersRouter.get("/:id/summary", async (req, res) => {
  const renter = await prisma.renter.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      rentals: {
        orderBy: { createdAt: "desc" },
        include: { item: { select: { id: true, name: true } }, payments: true },
      },
    },
  });
  if (!renter) throw new HttpError(404, "ভাড়াটিয়া পাওয়া যায়নি");

  const rentals = renter.rentals.map((r) => ({ ...r, financials: rentalFinancials(r) }));
  const totals = rentals.reduce(
    (acc, r) => ({
      charge: acc.charge + r.financials.charge,
      paid: acc.paid + r.financials.paid,
      due: acc.due + r.financials.due,
    }),
    { charge: 0, paid: 0, due: 0 },
  );
  const { rentals: _r, ...renterOnly } = renter;
  res.json({ renter: renterOnly, rentals, totals });
});

rentersRouter.patch("/:id", async (req, res) => {
  const body = renterSchema.partial().parse(req.body);
  const { count } = await prisma.renter.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: body,
  });
  if (count === 0) throw new HttpError(404, "ভাড়াটিয়া পাওয়া যায়নি");
  const renter = await prisma.renter.findUnique({ where: { id: req.params.id } });
  res.json({ renter });
});

rentersRouter.delete("/:id", async (req, res) => {
  const renter = await prisma.renter.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { _count: { select: { rentals: true } } },
  });
  if (!renter) throw new HttpError(404, "ভাড়াটিয়া পাওয়া যায়নি");
  if (renter._count.rentals > 0) {
    throw new HttpError(400, "এই ভাড়াটিয়ার ভাড়ার রেকর্ড আছে, তাই মুছে ফেলা যাবে না");
  }
  await prisma.renter.delete({ where: { id: renter.id } });
  res.json({ ok: true });
});
