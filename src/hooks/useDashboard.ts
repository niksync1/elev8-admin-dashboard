"use client";

import { useQuery } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase";
import type { DashboardSummary, InventoryTransaction } from "@/types/transaction";
import { useTenant } from "@/components/TenantProvider";

const supabase = getBrowserClient();

export function useDashboardSummary() {
  const { tenant, location } = useTenant();
  return useQuery({
    queryKey: ["dashboard", "summary", tenant?.id, location?.id],
    queryFn: async () => {
      if (!tenant || !location) return { totalProducts: 0, lowStockCount: 0, totalCategories: 0, recentTransactions: 0 };
      const [productsRes, levelsRes, categoriesRes, transactionsRes] = await Promise.all([
        supabase.from("products").select("id").eq("tenant_id", tenant.id),
        supabase.from("inventory_levels").select("product_id, quantity").eq("tenant_id", tenant.id).eq("location_id", location.id) as any,
        supabase.from("categories").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id) as any,
        supabase.from("inventory_transactions").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("location_id", location.id) as any,
      ]);

      const quantities = new Map((levelsRes.data ?? []).map((row: { product_id: string; quantity: number }) => [row.product_id, row.quantity]));
      const totalProducts = (productsRes.data ?? []).length;
      const lowStockCount = (productsRes.data ?? []).filter(
        (product: { id: string }) => Number(quantities.get(product.id) ?? 0) <= 5
      ).length;

      return {
        totalProducts,
        lowStockCount,
        totalCategories: categoriesRes.count ?? 0,
        recentTransactions: transactionsRes.count ?? 0,
      } as DashboardSummary;
    },
    enabled: !!tenant && !!location,
  });
}

// Fetches recent transactions, joining product names when possible.
// Falls back to a simpler query if the join relationship is unavailable.
export function useRecentTransactions(limit = 10) {
  const { tenant, location } = useTenant();
  return useQuery({
    queryKey: ["transactions", "recent", tenant?.id, location?.id, limit],
    queryFn: async () => {
      if (!tenant || !location) return [];
      const supabaseAny: any = supabase;

      try {
        const { data, error } = await supabaseAny
          .from("inventory_transactions")
          .select("*, products(name)")
          .eq("tenant_id", tenant.id)
          .eq("location_id", location.id)
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
        .eq("tenant_id", tenant.id)
        .eq("location_id", location.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[useRecentTransactions] base query failed:", error);
        throw error;
      }
      return (data ?? []) as (InventoryTransaction & { products: { name: string } | null })[];
    },
    retry: 1,
    enabled: !!tenant && !!location,
  });
}
