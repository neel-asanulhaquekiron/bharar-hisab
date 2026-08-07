import { Router } from "express";
import { prisma } from "../lib/prisma";
import { rentalFinancials } from "../lib/billing";
import { requireAuth } from "../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req, res) => {
  const rentals = await prisma.rental.findMany({
    where: { userId: req.userId },
    include: {
      item: { select: { id: true, name: true } },
      renter: { select: { id: true, name: true, phone: true } },
      payments: { select: { amount: true } },
    },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let activeRentals = 0;
  let unitsOut = 0;
  let totalDue = 0;
  const overdue: object[] = [];

  for (const rental of rentals) {
    const fin = rentalFinancials(rental, now);
    totalDue += fin.due;
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

  res.json({
    summary: {
      activeRentals,
      unitsOut,
      totalDue,
      overdueCount: overdue.length,
      overdue,
    },
  });
});
