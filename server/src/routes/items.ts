import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/error";
import { requireAuth } from "../middleware/auth";

export const itemsRouter = Router();
itemsRouter.use(requireAuth);

const itemSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  totalQuantity: z.number().int().min(0),
  rate: z.number().min(0),
  rateUnit: z.enum(["DAILY", "MONTHLY"]),
  initialCost: z.number().min(0).optional(),
  previousIncome: z.number().min(0).optional(),
});

/** quantity currently rented out per item (active + partially returned rentals) */
async function outQuantities(userId: string): Promise<Map<string, number>> {
  const grouped = await prisma.rental.groupBy({
    by: ["itemId"],
    where: { userId, status: { not: "RETURNED" } },
    _sum: { quantity: true, returnedQuantity: true },
  });
  return new Map(
    grouped.map((g) => [g.itemId, (g._sum.quantity ?? 0) - (g._sum.returnedQuantity ?? 0)]),
  );
}

/** per-item investment (purchase costs) for the user */
async function investments(userId: string): Promise<Map<string, number>> {
  const grouped = await prisma.itemPurchase.groupBy({
    by: ["itemId"],
    where: { item: { userId } },
    _sum: { totalCost: true },
  });
  return new Map(grouped.map((g) => [g.itemId, Number(g._sum.totalCost ?? 0)]));
}

/** per-item income (payments received on the item's rentals) for the user */
async function incomes(userId: string): Promise<Map<string, number>> {
  const rentals = await prisma.rental.findMany({
    where: { userId },
    select: { itemId: true, payments: { select: { amount: true } } },
  });
  const map = new Map<string, number>();
  for (const r of rentals) {
    const paid = r.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    map.set(r.itemId, (map.get(r.itemId) ?? 0) + paid);
  }
  return map;
}

function decorate(
  item: { id: string; totalQuantity: number; previousIncome: unknown },
  out: Map<string, number>,
  invest: Map<string, number>,
  income: Map<string, number>,
) {
  const investment = invest.get(item.id) ?? 0;
  const earned = (income.get(item.id) ?? 0) + Number(item.previousIncome ?? 0);
  return {
    ...item,
    outQuantity: out.get(item.id) ?? 0,
    availableQuantity: item.totalQuantity - (out.get(item.id) ?? 0),
    investment,
    income: earned,
    profit: earned - investment,
  };
}

itemsRouter.get("/", async (req, res) => {
  const [items, out, invest, income] = await Promise.all([
    prisma.item.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } }),
    outQuantities(req.userId),
    investments(req.userId),
    incomes(req.userId),
  ]);
  res.json({ items: items.map((i) => decorate(i, out, invest, income)) });
});

itemsRouter.post("/", async (req, res) => {
  const { initialCost, ...body } = itemSchema.parse(req.body);
  const item = await prisma.item.create({
    data: {
      ...body,
      userId: req.userId,
      ...(initialCost && initialCost > 0
        ? {
            purchases: {
              create: { quantity: body.totalQuantity, totalCost: initialCost, notes: "প্রথম ক্রয়" },
            },
          }
        : {}),
    },
  });
  res.status(201).json({ item });
});

itemsRouter.get("/:id", async (req, res) => {
  const item = await prisma.item.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { purchases: { orderBy: { purchasedAt: "desc" } } },
  });
  if (!item) throw new HttpError(404, "মালামাল পাওয়া যায়নি");
  const [out, invest, income] = await Promise.all([
    outQuantities(req.userId),
    investments(req.userId),
    incomes(req.userId),
  ]);
  res.json({ item: decorate(item, out, invest, income) });
});

const purchaseSchema = z.object({
  quantity: z.number().int().min(0),
  totalCost: z.number().min(0),
  notes: z.string().nullish(),
});

// "bought more of the same item": records the cost and increases stock
itemsRouter.post("/:id/purchases", async (req, res) => {
  const body = purchaseSchema.parse(req.body);
  if (body.quantity === 0 && body.totalCost === 0) {
    throw new HttpError(400, "পরিমাণ বা খরচ অন্তত একটি দিতে হবে");
  }
  const item = await prisma.item.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!item) throw new HttpError(404, "মালামাল পাওয়া যায়নি");
  const [purchase] = await prisma.$transaction([
    prisma.itemPurchase.create({
      data: {
        itemId: item.id,
        quantity: body.quantity,
        totalCost: body.totalCost,
        notes: body.notes ?? null,
      },
    }),
    prisma.item.update({
      where: { id: item.id },
      data: { totalQuantity: { increment: body.quantity } },
    }),
  ]);
  res.status(201).json({ purchase });
});

const purchasePatchSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  totalCost: z.number().min(0).optional(),
  notes: z.string().nullish(),
});

itemsRouter.patch("/:id/purchases/:purchaseId", async (req, res) => {
  const body = purchasePatchSchema.parse(req.body);
  const purchase = await prisma.itemPurchase.findFirst({
    where: { id: req.params.purchaseId, itemId: req.params.id, item: { userId: req.userId } },
  });
  if (!purchase) throw new HttpError(404, "কেনার হিসাব পাওয়া যায়নি");
  const quantityDelta = body.quantity !== undefined ? body.quantity - purchase.quantity : 0;
  const [updated] = await prisma.$transaction([
    prisma.itemPurchase.update({ where: { id: purchase.id }, data: body }),
    prisma.item.update({
      where: { id: purchase.itemId },
      data: { totalQuantity: { increment: quantityDelta } },
    }),
  ]);
  res.json({ purchase: updated });
});

itemsRouter.delete("/:id/purchases/:purchaseId", async (req, res) => {
  const purchase = await prisma.itemPurchase.findFirst({
    where: { id: req.params.purchaseId, itemId: req.params.id, item: { userId: req.userId } },
  });
  if (!purchase) throw new HttpError(404, "কেনার হিসাব পাওয়া যায়নি");
  await prisma.$transaction([
    prisma.itemPurchase.delete({ where: { id: purchase.id } }),
    prisma.item.update({
      where: { id: purchase.itemId },
      data: { totalQuantity: { decrement: purchase.quantity } },
    }),
  ]);
  res.json({ ok: true });
});

itemsRouter.patch("/:id", async (req, res) => {
  const body = itemSchema.omit({ initialCost: true }).partial().parse(req.body);
  const { count } = await prisma.item.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: body,
  });
  if (count === 0) throw new HttpError(404, "মালামাল পাওয়া যায়নি");
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  res.json({ item });
});

itemsRouter.delete("/:id", async (req, res) => {
  const item = await prisma.item.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { _count: { select: { rentals: true } } },
  });
  if (!item) throw new HttpError(404, "মালামাল পাওয়া যায়নি");
  if (item._count.rentals > 0) {
    throw new HttpError(400, "এই মালামালের ভাড়ার রেকর্ড আছে, তাই মুছে ফেলা যাবে না");
  }
  await prisma.item.delete({ where: { id: item.id } });
  res.json({ ok: true });
});
