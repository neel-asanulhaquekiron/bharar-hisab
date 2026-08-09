// FLAT = যতদিনই রাখুক, পুরো ভাড়ার জন্য এক দাম
export type RateUnit = "DAILY" | "MONTHLY" | "FLAT";
export type RentalStatus = "ACTIVE" | "PARTIAL" | "RETURNED";

export type User = { id: string; name: string; email: string };

export type ItemPurchase = {
  id: string;
  itemId: string;
  quantity: number;
  totalCost: string;
  notes: string | null;
  purchasedAt: string;
};

export type Item = {
  id: string;
  name: string;
  description: string | null;
  totalQuantity: number;
  rate: string; // Prisma Decimal serializes as string
  rateUnit: "DAILY" | "MONTHLY"; // মালামালের নিজের হিসাব — FLAT শুধু ভাড়া-প্রতি বাছাই
  previousIncome: string;
  createdAt: string;
  outQuantity: number;
  availableQuantity: number;
  investment: number;
  income: number;
  profit: number;
  purchases?: ItemPurchase[];
};

export type Renter = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  activeRentals?: number;
};

export type Financials = { periods: number; charge: number; paid: number; due: number };

export type Rental = {
  id: string;
  quantity: number;
  rate: string;
  rateUnit: RateUnit;
  startDate: string;
  expectedReturnDate: string | null;
  returnedQuantity: number;
  status: RentalStatus;
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
  item: { id: string; name: string; rateUnit?: RateUnit };
  renter: { id: string; name: string; phone?: string | null };
  payments: Payment[];
  financials: Financials;
};

export type Payment = {
  id: string;
  rentalId: string;
  amount: string;
  paidAt: string;
  method: string | null;
  notes: string | null;
  rental?: { id: string; item: { name: string }; renter: { id: string; name: string } };
};

export type DashboardSummary = {
  activeRentals: number;
  unitsOut: number;
  totalDue: number;
  overdueCount: number;
  overdue: {
    id: string;
    renter: { id: string; name: string; phone: string | null };
    item: { id: string; name: string };
    quantityOut: number;
    expectedReturnDate: string;
    due: number;
  }[];
  totalInvestment: number;
  totalIncome: number;
  profit: number;
};

export type RenterSummary = {
  renter: Renter;
  rentals: Rental[];
  totals: { charge: number; paid: number; due: number };
};
