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
        supabase.from("products").select("id, stock_quantity") as any,
        supabase.from("categories").select("id", { count: "exact", head: true }) as any,
        supabase.from("inventory_transactions").select("id", { count: "exact", head: true }) as any,
      ]);

      const totalProducts = (productsRes.data ?? []).length;
      const lowStockCount = (productsRes.data ?? []).filter(
        (p: any) => Number(p.stock_quantity) <= 5
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
// Falls back to a simpler query if the join relationship is unavailable.
export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ["transactions", "recent", limit],
    queryFn: async () => {
      const supabaseAny: any = supabase;

      try {
        const { data, error } = await supabaseAny
          .from("inventory_transactions")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        return (data ?? []) as (InventoryTransaction & { products: { name: string } | null })[];
      } catch (joinError) {
        // Join failed (e.g. FK/RLS constraint) — fall back to base query
      }

      const { data, error } = await supabaseAny
        .from("inventory_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[useRecentTransactions] base query failed:", error);
        throw error;
      }
      return (data ?? []) as (InventoryTransaction & { products: { name: string } | null })[];
    },
    retry: 1,
  });
}