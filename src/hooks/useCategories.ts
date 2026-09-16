"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/types/category";
import { useTenant } from "@/components/TenantProvider";

const supabase: any = getBrowserClient();

export function useCategories() {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ["categories", tenant?.id],
    queryFn: async () => {
      if (!tenant) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: !!tenant,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (!tenant) throw new Error("Select a business before creating a category.");
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { error } = await supabase.from("categories").insert([
        {
          name: input.name,
          tenant_id: tenant.id,
          slug,
          description: input.description ?? null,
          image_url: input.image_url ?? null,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateCategoryInput) => {
      if (!tenant) throw new Error("Select a business before updating a category.");
      const updates: Record<string, any> = {};

      if (input.name !== undefined) {
        updates.name = input.name;
        updates.slug = input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      if (input.description !== undefined) updates.description = input.description;
      if (input.image_url !== undefined) updates.image_url = input.image_url;

      const { error } = await supabase
        .from("categories")
        .update(updates)
        .eq("tenant_id", tenant.id)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant) throw new Error("Select a business before deleting a category.");
      const { error } = await supabase.from("categories").delete().eq("tenant_id", tenant.id).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
