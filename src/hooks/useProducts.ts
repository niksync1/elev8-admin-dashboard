"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase";
import type { Product, CreateProductInput, UpdateProductInput } from "@/types/product";
import { useTenant } from "@/components/TenantProvider";

const supabase: any = getBrowserClient();

export function useProducts(search?: string) {
  const { tenant, location } = useTenant();
  return useQuery({
    queryKey: ["products", tenant?.id, location?.id, search],
    queryFn: async () => {
      if (!tenant || !location) return [];
      let query = supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("updated_at", { ascending: false });

      if (search && search.trim().length >= 2) {
        const normalized = search.trim();
        const safe = normalized.replace(/[,%()]/g, " ");
        query = query.or(`name.ilike.%${safe}%,barcode.eq.${normalized.replace(/[,()]/g, "")}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const products = (data ?? []) as Product[];
      if (!products.length) return products;
      const levels = await supabase
        .from("inventory_levels")
        .select("product_id,quantity")
        .eq("tenant_id", tenant.id)
        .eq("location_id", location.id)
        .in("product_id", products.map((product) => product.id));
      if (levels.error) throw levels.error;
      const quantities = new Map((levels.data ?? []).map((row: any) => [row.product_id, row.quantity]));
      return products.map((product) => ({
        ...product,
        location_quantity: Number(quantities.get(product.id) ?? 0),
      }));
    },
    enabled: !!tenant && !!location,
  });
}

export function useProduct(id: string | undefined) {
  const { tenant, location } = useTenant();
  return useQuery({
    queryKey: ["product", tenant?.id, location?.id, id],
    queryFn: async () => {
      if (!id || !tenant || !location) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("id", id)
        .single();
      if (error) throw error;
      const level = await supabase
        .from("inventory_levels")
        .select("quantity")
        .eq("tenant_id", tenant.id)
        .eq("location_id", location.id)
        .eq("product_id", id)
        .maybeSingle();
      if (level.error) throw level.error;
      return { ...(data as Product), location_quantity: Number(level.data?.quantity ?? 0) };
    },
    enabled: !!id && !!tenant && !!location,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      if (!tenant) throw new Error("Select a business before creating a product.");
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { error } = await supabase.from("products").insert([
        {
          name: input.name,
          tenant_id: tenant.id,
          slug,
          barcode: input.barcode,
          description: input.description ?? null,
          price: input.price,
          compare_at_price: input.compare_at_price ?? null,
          category: input.category ?? null,
          images: input.images ?? [],
          metadata: input.metadata ?? {},
          is_active: input.is_active ?? true,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct(id: string | undefined) {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (input: UpdateProductInput) => {
      if (!id || !tenant) throw new Error("Product ID and business are required");

      const updates: Record<string, any> = {};

      if (input.name !== undefined) {
        updates.name = input.name;
        updates.slug = input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      if (input.barcode !== undefined) updates.barcode = input.barcode;
      if (input.description !== undefined) updates.description = input.description;
      if (input.price !== undefined) updates.price = input.price;
      if (input.compare_at_price !== undefined) updates.compare_at_price = input.compare_at_price;
      if (input.category !== undefined) updates.category = input.category;
      if (input.images !== undefined) updates.images = input.images;
      if (input.is_active !== undefined) updates.is_active = input.is_active;

      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("tenant_id", tenant.id)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant) throw new Error("Select a business before deleting a product.");
      const { error } = await supabase.from("products").delete().eq("tenant_id", tenant.id).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
