"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/components/TenantProvider";
import { getBrowserClient } from "@/lib/supabase";
import type { ManageableTenantRole, TenantUser } from "@/types/user";

const supabase = getBrowserClient();
type MembershipRow = { user_id: string; role: TenantUser["role"]; status: TenantUser["status"]; created_at: string };
type ProfileRow = { id: string; email: string; name: string | null; avatar_url: string | null };
type AssignmentRow = { user_id: string; location_id: string };

export function useUsers() {
  const { tenant, membership } = useTenant();
  return useQuery({
    queryKey: ["tenant-users", tenant?.id],
    enabled: !!tenant && membership?.role === "owner",
    queryFn: async (): Promise<TenantUser[]> => {
      if (!tenant) return [];
      const memberships = await supabase.from("tenant_memberships")
        .select("user_id,role,status,created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: true });
      if (memberships.error) throw memberships.error;
      const membershipRows = (memberships.data ?? []) as MembershipRow[];
      const userIds = membershipRows.map((row) => row.user_id);
      if (!userIds.length) return [];
      const [profiles, assignments] = await Promise.all([
        supabase.from("profiles").select("id,email,name,avatar_url").in("id", userIds),
        supabase.from("location_memberships").select("user_id,location_id").eq("tenant_id", tenant.id),
      ]);
      if (profiles.error) throw profiles.error;
      if (assignments.error) throw assignments.error;
      const profilesById = new Map(((profiles.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
      const locationsByUser = new Map<string, string[]>();
      for (const assignment of (assignments.data ?? []) as AssignmentRow[]) {
        const current = locationsByUser.get(assignment.user_id) ?? [];
        current.push(assignment.location_id);
        locationsByUser.set(assignment.user_id, current);
      }
      return membershipRows.map((row) => {
        const profile = profilesById.get(row.user_id);
        return {
          userId: row.user_id,
          email: profile?.email ?? "Email unavailable",
          name: profile?.name ?? undefined,
          avatar_url: profile?.avatar_url ?? undefined,
          role: row.role,
          status: row.status,
          locationIds: locationsByUser.get(row.user_id) ?? [],
          joinedAt: row.created_at,
        } as TenantUser;
      });
    },
  });
}

async function parseResponse(response: Response) {
  const data = (await response.json()) as { error?: string; message?: string; link?: string };
  if (!response.ok) throw new Error(data.error ?? "The user operation failed.");
  return data;
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  return useMutation({
    mutationFn: async (input: { email: string; role: ManageableTenantRole; locationIds: string[] }) => {
      if (!tenant) throw new Error("Select a business first.");
      return parseResponse(await fetch("/api/invite-user", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, ...input }),
      }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-users", tenant?.id] }),
  });
}

export function useUpdateTenantUser() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  return useMutation({
    mutationFn: async (input: { userId: string; role: ManageableTenantRole; locationIds: string[] }) => {
      if (!tenant) throw new Error("Select a business first.");
      return parseResponse(await fetch("/api/update-user-role", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, ...input }),
      }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-users", tenant?.id] }),
  });
}

export function useResetPassword() {
  const { tenant } = useTenant();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!tenant) throw new Error("Select a business first.");
      return parseResponse(await fetch("/api/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, userId }),
      }));
    },
  });
}
