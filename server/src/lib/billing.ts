import type { Payment, RateUnit, Rental } from "@prisma/client";

/**
 * Billing periods between start and end, charged in whole units:
 * DAILY — every started day counts (same-day rental = 1 day).
 * MONTHLY — every started month counts (rented Jan 5, returned Feb 5 = 1 month;
 * Feb 6 = 2 months).
 * FLAT — one fixed charge for the whole rental, however long it runs.
 */
export function billingPeriods(start: Date, end: Date, unit: RateUnit): number {
  if (unit === "FLAT") return 1;
  if (end <= start) return 1;
  if (unit === "DAILY") {
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  }
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() > start.getDate()) months += 1;
  return Math.max(1, months);
}

export type RentalFinancials = {
  periods: number;
  charge: number;
  paid: number;
  due: number;
};

/**
 * Charge accrues on the full quantity from startDate until the rental is fully
 * returned (closedAt), or until now while it is still open.
 */
export function rentalFinancials(
  rental: Pick<Rental, "quantity" | "rate" | "rateUnit" | "startDate" | "closedAt"> & {
    payments: Pick<Payment, "amount">[];
  },
  now: Date = new Date(),
): RentalFinancials {
  const periods = billingPeriods(rental.startDate, rental.closedAt ?? now, rental.rateUnit);
  const charge = periods * Number(rental.rate) * rental.quantity;
  const paid = rental.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return { periods, charge, paid, due: charge - paid };
}
