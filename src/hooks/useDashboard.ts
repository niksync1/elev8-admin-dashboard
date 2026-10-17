"use client";

import { useQuery } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase";
import type { DashboardSummary, InventoryTransaction } from "@/types/transaction";

const supabase = getBrowserClient();

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const [productsRes, categoriesRes, transactionsRes] = await Promise.all([
        supabase.from("products").select("id, stock_quantity"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("inventory_transactions").select("id", { count: "exact", head: true }),
      ]);

      const totalProducts = (productsRes.data ?? []).length;
      const lowStockCount = (productsRes.data ?? []).filter(
        (p: { stock_quantity: number | string | null }) => Number(p.stock_quantity) <= 5
      ).length;

      return {
        totalProducts,
        lowStockCount,
        totalCategories: categoriesRes.count ?? 0,
        recentTransactions: transactionsRes.count ?? 0,
      } as DashboardSummary;
    },
  });
}

// Fetches recent transactions, joining product names when possible.
// If the embedded join is unavailable (missing FK/RLS), falls back to a
// base query and resolves product names with a follow-up lookup.
export type TransactionWithProduct = InventoryTransaction & {
  products: { name: string } | null;
};

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ["transactions", "recent", limit],
    queryFn: async (): Promise<TransactionWithProduct[]> => {
      try {
        const { data, error } = await supabase
          .from("inventory_transactions")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        return (data ?? []) as TransactionWithProduct[];
      } catch (joinError) {
        // Join failed (e.g. FK/RLS constraint) — fall back to base query
        console.warn(
          "[useRecentTransactions] embedded products join failed, resolving names via lookup:",
          joinError
        );
      }

      const { data, error } = await supabase
        .from("inventory_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[useRecentTransactions] base query failed:", error);
        throw error;
      }

      const rows = (data ?? []) as InventoryTransaction[];

      // Resolve product names with a single follow-up query on the
      // distinct product ids, then attach them in the same shape the
      // embedded join would have returned.
      const productIds = [
        ...new Set(
          rows.map((tx) => tx.product_id).filter((id): id is string => Boolean(id))
        ),
      ];

      let nameById = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds);

        if (productsError) {
          console.warn(
            "[useRecentTransactions] product name lookup failed:",
            productsError
          );
        } else {
          nameById = new Map(
            (products ?? []).map((p: { id: string; name: string }) => [p.id, p.name])
          );
        }
      }

      return rows.map((tx) => ({
        ...tx,
        products: nameById.has(tx.product_id) ? { name: nameById.get(tx.product_id)! } : null,
      }));
    },
    retry: 1,
  });
}