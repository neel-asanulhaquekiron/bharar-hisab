import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { DashboardSummary, Item, Rental, Renter, RenterSummary } from "./types";

// ---------- items ----------

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => (await api.get<{ items: Item[] }>("/items")).data.items,
  });
}

export type ItemInput = {
  name: string;
  description?: string | null;
  totalQuantity: number;
  rate: number;
  rateUnit: "DAILY" | "MONTHLY";
};

export function useSaveItem(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ItemInput) =>
      id ? (await api.patch(`/items/${id}`, input)).data : (await api.post("/items", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/items/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

// ---------- renters ----------

export function useRenters() {
  return useQuery({
    queryKey: ["renters"],
    queryFn: async () => (await api.get<{ renters: Renter[] }>("/renters")).data.renters,
  });
}

export function useRenterSummary(id: string) {
  return useQuery({
    queryKey: ["renters", id, "summary"],
    queryFn: async () => (await api.get<RenterSummary>(`/renters/${id}/summary`)).data,
    enabled: !!id,
  });
}

export type RenterInput = {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
};

export function useSaveRenter(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RenterInput) =>
      id
        ? (await api.patch(`/renters/${id}`, input)).data
        : (await api.post("/renters", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["renters"] }),
  });
}

export function useDeleteRenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/renters/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["renters"] }),
  });
}

// ---------- rentals ----------

function invalidateRentalData(qc: ReturnType<typeof useQueryClient>) {
  for (const key of ["rentals", "items", "renters", "dashboard"]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useRentals(status?: "OPEN" | "RETURNED") {
  return useQuery({
    queryKey: ["rentals", status ?? "all"],
    queryFn: async () =>
      (await api.get<{ rentals: Rental[] }>("/rentals", { params: { status } })).data.rentals,
  });
}

export function useRental(id: string) {
  return useQuery({
    queryKey: ["rentals", "detail", id],
    queryFn: async () => (await api.get<{ rental: Rental }>(`/rentals/${id}`)).data.rental,
    enabled: !!id,
  });
}

export type RentalInput = {
  renterId: string;
  itemId: string;
  quantity: number;
  rate?: number;
  startDate?: string;
  expectedReturnDate?: string | null;
  notes?: string | null;
  advanceAmount?: number;
  advanceMethod?: string | null;
};

export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RentalInput) => (await api.post("/rentals", input)).data,
    onSuccess: () => invalidateRentalData(qc),
  });
}

export function useReturnRental(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quantity: number) =>
      (await api.post(`/rentals/${id}/return`, { quantity })).data,
    onSuccess: () => invalidateRentalData(qc),
  });
}

// ---------- payments ----------

export type PaymentInput = {
  rentalId: string;
  amount: number;
  method?: string | null;
  notes?: string | null;
};

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInput) => (await api.post("/payments", input)).data,
    onSuccess: () => invalidateRentalData(qc),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/payments/${id}`)).data,
    onSuccess: () => invalidateRentalData(qc),
  });
}

// ---------- dashboard ----------

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () =>
      (await api.get<{ summary: DashboardSummary }>("/dashboard/summary")).data.summary,
  });
}
