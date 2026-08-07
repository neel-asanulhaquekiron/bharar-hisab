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

itemsRouter.get("/", async (req, res) => {
  const [items, out] = await Promise.all([
    prisma.item.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } }),
    outQuantities(req.userId),
  ]);
  res.json({
    items: items.map((i) => ({
      ...i,
      outQuantity: out.get(i.id) ?? 0,
      availableQuantity: i.totalQuantity - (out.get(i.id) ?? 0),
    })),
  });
});

itemsRouter.post("/", async (req, res) => {
  const body = itemSchema.parse(req.body);
  const item = await prisma.item.create({ data: { ...body, userId: req.userId } });
  res.status(201).json({ item });
});

itemsRouter.get("/:id", async (req, res) => {
  const item = await prisma.item.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!item) throw new HttpError(404, "মালামাল পাওয়া যায়নি");
  const out = await outQuantities(req.userId);
  res.json({
    item: {
      ...item,
      outQuantity: out.get(item.id) ?? 0,
      availableQuantity: item.totalQuantity - (out.get(item.id) ?? 0),
    },
  });
});

itemsRouter.patch("/:id", async (req, res) => {
  const body = itemSchema.partial().parse(req.body);
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
