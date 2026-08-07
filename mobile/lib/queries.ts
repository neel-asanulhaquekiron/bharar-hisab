import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Item, Renter, RenterSummary } from "./types";

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
