import { Router } from "express";
import { prisma } from "../lib/prisma";
import { rentalFinancials } from "../lib/billing";
import { requireAuth } from "../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req, res) => {
  const [rentals, investAgg] = await Promise.all([
    prisma.rental.findMany({
      where: { userId: req.userId },
      include: {
        item: { select: { id: true, name: true } },
        renter: { select: { id: true, name: true, phone: true } },
        payments: { select: { amount: true } },
      },
    }),
    prisma.itemPurchase.aggregate({
      where: { item: { userId: req.userId } },
      _sum: { totalCost: true },
    }),
  ]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let activeRentals = 0;
  let unitsOut = 0;
  let totalDue = 0;
  let totalIncome = 0;
  const overdue: object[] = [];

  for (const rental of rentals) {
    const fin = rentalFinancials(rental, now);
    totalDue += fin.due;
    totalIncome += fin.paid;
    if (rental.status !== "RETURNED") {
      activeRentals += 1;
      unitsOut += rental.quantity - rental.returnedQuantity;
      if (rental.expectedReturnDate && rental.expectedReturnDate < today) {
        overdue.push({
          id: rental.id,
          renter: rental.renter,
          item: rental.item,
          quantityOut: rental.quantity - rental.returnedQuantity,
          expectedReturnDate: rental.expectedReturnDate,
          due: fin.due,
        });
      }
    }
  }

  const totalInvestment = Number(investAgg._sum.totalCost ?? 0);
  res.json({
    summary: {
      activeRentals,
      unitsOut,
      totalDue,
      overdueCount: overdue.length,
      overdue,
      totalInvestment,
      totalIncome,
      profit: totalIncome - totalInvestment,
    },
  });
});
