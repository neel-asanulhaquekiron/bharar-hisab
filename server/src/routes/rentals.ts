import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { rentalFinancials } from "../lib/billing";
import { HttpError } from "../middleware/error";
import { requireAuth } from "../middleware/auth";

export const rentalsRouter = Router();
rentalsRouter.use(requireAuth);

const rentalInclude = {
  item: { select: { id: true, name: true, rateUnit: true } },
  renter: { select: { id: true, name: true, phone: true } },
  payments: true,
} as const;

function withFinancials<T extends Parameters<typeof rentalFinancials>[0]>(rental: T) {
  return { ...rental, financials: rentalFinancials(rental) };
}

const createSchema = z.object({
  renterId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1),
  rate: z.number().min(0).optional(),
  startDate: z.coerce.date().optional(),
  expectedReturnDate: z.coerce.date().nullish(),
  notes: z.string().nullish(),
  advanceAmount: z.number().positive().optional(),
  advanceMethod: z.string().nullish(),
});

rentalsRouter.post("/", async (req, res) => {
  const body = createSchema.parse(req.body);
  const [renter, item] = await Promise.all([
    prisma.renter.findFirst({ where: { id: body.renterId, userId: req.userId } }),
    prisma.item.findFirst({ where: { id: body.itemId, userId: req.userId } }),
  ]);
  if (!renter) throw new HttpError(404, "ভাড়াটিয়া পাওয়া যায়নি");
  if (!item) throw new HttpError(404, "মালামাল পাওয়া যায়নি");

  const out = await prisma.rental.aggregate({
    where: { itemId: item.id, status: { not: "RETURNED" } },
    _sum: { quantity: true, returnedQuantity: true },
  });
  const available =
    item.totalQuantity - ((out._sum.quantity ?? 0) - (out._sum.returnedQuantity ?? 0));
  if (body.quantity > available) {
    throw new HttpError(400, `পর্যাপ্ত মালামাল নেই — মাত্র ${available}টি আছে`);
  }

  const rental = await prisma.rental.create({
    data: {
      userId: req.userId,
      renterId: renter.id,
      itemId: item.id,
      quantity: body.quantity,
      rate: body.rate ?? item.rate,
      rateUnit: item.rateUnit,
      startDate: body.startDate ?? new Date(),
      expectedReturnDate: body.expectedReturnDate ?? null,
      notes: body.notes ?? null,
      ...(body.advanceAmount
        ? {
            payments: {
              create: { amount: body.advanceAmount, method: body.advanceMethod ?? null },
            },
          }
        : {}),
    },
    include: rentalInclude,
  });
  res.status(201).json({ rental: withFinancials(rental) });
});

const listSchema = z.object({
  status: z.enum(["ACTIVE", "PARTIAL", "RETURNED", "OPEN"]).optional(),
  renterId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
});

rentalsRouter.get("/", async (req, res) => {
  const query = listSchema.parse(req.query);
  const rentals = await prisma.rental.findMany({
    where: {
      userId: req.userId,
      renterId: query.renterId,
      itemId: query.itemId,
      ...(query.status === "OPEN"
        ? { status: { not: "RETURNED" } }
        : query.status
          ? { status: query.status }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    include: rentalInclude,
  });
  res.json({ rentals: rentals.map(withFinancials) });
});

rentalsRouter.get("/:id", async (req, res) => {
  const rental = await prisma.rental.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: rentalInclude,
  });
  if (!rental) throw new HttpError(404, "ভাড়ার রেকর্ড পাওয়া যায়নি");
  res.json({ rental: withFinancials(rental) });
});

const patchSchema = z.object({
  expectedReturnDate: z.coerce.date().nullish(),
  rate: z.number().min(0).optional(),
  notes: z.string().nullish(),
});

rentalsRouter.patch("/:id", async (req, res) => {
  const body = patchSchema.parse(req.body);
  const { count } = await prisma.rental.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: body,
  });
  if (count === 0) throw new HttpError(404, "ভাড়ার রেকর্ড পাওয়া যায়নি");
  const rental = await prisma.rental.findUnique({
    where: { id: req.params.id },
    include: rentalInclude,
  });
  res.json({ rental: withFinancials(rental!) });
});

const returnSchema = z.object({ quantity: z.number().int().min(1) });

rentalsRouter.post("/:id/return", async (req, res) => {
  const body = returnSchema.parse(req.body);
  const rental = await prisma.rental.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!rental) throw new HttpError(404, "ভাড়ার রেকর্ড পাওয়া যায়নি");
  if (rental.status === "RETURNED") throw new HttpError(400, "সব মালামাল আগেই ফেরত হয়ে গেছে");

  const remaining = rental.quantity - rental.returnedQuantity;
  if (body.quantity > remaining) {
    throw new HttpError(400, `মাত্র ${remaining}টি ফেরত বাকি আছে`);
  }

  const returnedQuantity = rental.returnedQuantity + body.quantity;
  const fullyReturned = returnedQuantity === rental.quantity;
  const updated = await prisma.rental.update({
    where: { id: rental.id },
    data: {
      returnedQuantity,
      status: fullyReturned ? "RETURNED" : "PARTIAL",
      closedAt: fullyReturned ? new Date() : null,
    },
    include: rentalInclude,
  });
  res.json({ rental: withFinancials(updated) });
});
