import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { rentalFinancials } from "../lib/billing";
import { pushEnabled, sendPushToUser } from "../lib/push";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function bn(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

function taka(amount: number): string {
  return `৳${bn(Math.round(amount).toLocaleString("en-IN"))}`;
}

/**
 * One reminder per user per day: overdue returns first, otherwise total dues.
 * Sends nothing when there is nothing to chase.
 */
export async function runDueReminders(): Promise<void> {
  if (!pushEnabled()) return;

  const users = await prisma.user.findMany({
    where: { deviceTokens: { some: {} } },
    select: { id: true },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const user of users) {
    const rentals = await prisma.rental.findMany({
      where: { userId: user.id, status: { not: "RETURNED" } },
      include: {
        item: { select: { name: true } },
        renter: { select: { name: true } },
        payments: { select: { amount: true } },
      },
    });

    let totalDue = 0;
    const overdue: { line: string; id: string }[] = [];
    for (const rental of rentals) {
      const fin = rentalFinancials(rental, now);
      totalDue += fin.due;
      if (rental.expectedReturnDate && rental.expectedReturnDate < today) {
        const qty = rental.quantity - rental.returnedQuantity;
        overdue.push({
          id: rental.id,
          line: `${rental.renter.name} — ${rental.item.name} ${bn(qty)}টি (বাকি ${taka(fin.due)})`,
        });
      }
    }

    if (overdue.length > 0) {
      const body =
        overdue[0].line + (overdue.length > 1 ? ` · আরও ${bn(overdue.length - 1)}টি` : "");
      await sendPushToUser(user.id, `মেয়াদ পার — ${bn(overdue.length)}টি ভাড়া`, body, {
        url: overdue.length === 1 ? `/rentals/${overdue[0].id}` : "/",
      });
    } else if (totalDue > 0) {
      await sendPushToUser(user.id, "ভাড়ার হিসাব", `মোট বাকি ${taka(totalDue)}`, { url: "/" });
    }
  }
}

export function startReminderJob(): void {
  // 9:00 every morning, Bangladesh time
  cron.schedule("0 9 * * *", () => {
    runDueReminders().catch((err) => console.error("reminder job failed:", err));
  }, { timezone: "Asia/Dhaka" });
}
