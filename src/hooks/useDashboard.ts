"use client";

import { useQuery } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase";
import type { DashboardSummary, InventoryTransaction, ResolvedInventoryTransaction } from "@/types/transaction";
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

// Resolve product names explicitly. inventory_transactions has both the legacy
// product_id FK and the tenant/product composite FK, which makes an embedded
// `products(name)` relation ambiguous to PostgREST.
export function useRecentTransactions(limit = 10) {
  const { tenant, location } = useTenant();
  return useQuery({
    queryKey: ["transactions", "recent", tenant?.id, location?.id, limit],
    queryFn: async () => {
      if (!tenant || !location) return [];
      const supabaseAny: any = supabase;
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

      const transactions = (data ?? []) as InventoryTransaction[];
      const productIds = [...new Set(transactions.map((tx) => tx.product_id))];
      const actorIds = [
        ...new Set(
          transactions
            .map((tx) => tx.created_by)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      if (!productIds.length) return [];

      const [productsResult, profilesResult] = await Promise.all([
        supabaseAny
          .from("products")
          .select("id,name")
          .eq("tenant_id", tenant.id)
          .in("id", productIds),
        actorIds.length
          ? supabaseAny.from("profiles").select("id,name,email").in("id", actorIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (productsResult.error) {
        console.error("[useRecentTransactions] product lookup failed:", productsResult.error);
        throw productsResult.error;
      }
      if (profilesResult.error) {
        console.error("[useRecentTransactions] profile lookup failed:", profilesResult.error);
        throw profilesResult.error;
      }

      const productNames = new Map(
        (productsResult.data ?? []).map((product: { id: string; name: string }) => [product.id, product.name])
      );
      const actorNames = new Map<string, string>(
        (profilesResult.data ?? []).map(
          (profile: { id: string; name: string | null; email: string }) => [
            profile.id,
            profile.name?.trim() || profile.email,
          ]
        )
      );

      return transactions.map((transaction): ResolvedInventoryTransaction => ({
        ...transaction,
        products: productNames.has(transaction.product_id)
          ? { name: productNames.get(transaction.product_id) as string }
          : null,
        performed_by:
          (transaction.created_by && actorNames.get(transaction.created_by)) || "Unknown user",
      }));
    },
    retry: 1,
    enabled: !!tenant && !!location,
  });
}
