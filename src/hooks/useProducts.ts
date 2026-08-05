"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase";
import type { Product, CreateProductInput, UpdateProductInput } from "@/types/product";

const supabase: any = getBrowserClient();

export function useProducts(search?: string) {
  return useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .order("updated_at", { ascending: false });

      if (search && search.trim().length >= 2) {
        query = query.or(
          `name.ilike.%${search}%,barcode.ilike.%${search}%,category.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { error } = await supabase.from("products").insert([
        {
          name: input.name,
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

  return useMutation({
    mutationFn: async (input: UpdateProductInput) => {
      if (!id) throw new Error("Product ID is required");

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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}