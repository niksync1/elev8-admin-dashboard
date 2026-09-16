"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase";
import type { Location, Tenant, TenantAccess, TenantContextValue, TenantMembership } from "@/types/tenancy";

const TenantContext = createContext<TenantContextValue | null>(null);

interface StoredSelection {
  tenantId: string;
  locationId: string;
}

function selectionKey(userId: string) {
  return `admin-tenant-selection:v1:${userId}`;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [accesses, setAccesses] = useState<TenantAccess[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selection, setSelection] = useState<StoredSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = getBrowserClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error("Your session has expired. Please sign in again.");

        const membershipsResult = await supabase
          .from("tenant_memberships")
          .select("tenant_id,user_id,role,status,tenants!inner(id,name,slug,status,plan)")
          .eq("user_id", authData.user.id)
          .eq("status", "active");
        if (membershipsResult.error) throw membershipsResult.error;

        const nextAccesses: TenantAccess[] = (membershipsResult.data ?? []).map((raw: unknown): TenantAccess => {
          const row = raw as unknown as TenantMembership & { tenants: Tenant | Tenant[] };
          const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
          return {
            tenant,
            membership: {
              tenant_id: row.tenant_id,
              user_id: row.user_id,
              role: row.role,
              status: row.status,
            },
          } satisfies TenantAccess;
        });

        const tenantIds = nextAccesses.map(({ tenant }) => tenant.id);
        const locationResult = tenantIds.length
          ? await supabase
              .from("locations")
              .select("id,tenant_id,name,code,is_active")
              .in("tenant_id", tenantIds)
              .eq("is_active", true)
              .order("name")
          : { data: [], error: null };
        if (locationResult.error) throw locationResult.error;

        const nextLocations = (locationResult.data ?? []) as Location[];
        let stored: StoredSelection | null = null;
        const rawStored = window.localStorage.getItem(selectionKey(authData.user.id));
        if (rawStored) {
          try {
            stored = JSON.parse(rawStored) as StoredSelection;
          } catch {
            window.localStorage.removeItem(selectionKey(authData.user.id));
          }
        }

        const tenantId = nextAccesses.some(({ tenant }) => tenant.id === stored?.tenantId)
          ? stored!.tenantId
          : nextAccesses[0]?.tenant.id;
        const tenantLocations = nextLocations.filter((location) => location.tenant_id === tenantId);
        const locationId = tenantLocations.some((location) => location.id === stored?.locationId)
          ? stored!.locationId
          : tenantLocations[0]?.id;
        const nextSelection = tenantId && locationId ? { tenantId, locationId } : null;

        if (!active) return;
        setUserId(authData.user.id);
        setAccesses(nextAccesses);
        setLocations(nextLocations);
        setSelection(nextSelection);
        if (nextSelection) {
          window.localStorage.setItem(selectionKey(authData.user.id), JSON.stringify(nextSelection));
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load business access.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const selectContext = useCallback(
    (tenantId: string, requestedLocationId?: string) => {
      if (!accesses.some(({ tenant }) => tenant.id === tenantId)) return;
      const tenantLocations = locations.filter((location) => location.tenant_id === tenantId);
      const locationId = tenantLocations.some(({ id }) => id === requestedLocationId)
        ? requestedLocationId!
        : tenantLocations[0]?.id;
      if (!locationId) return;
      const next = { tenantId, locationId };
      setSelection(next);
      if (userId) window.localStorage.setItem(selectionKey(userId), JSON.stringify(next));
      void queryClient.invalidateQueries();
    },
    [accesses, locations, queryClient, userId]
  );

  const value = useMemo<TenantContextValue>(() => {
    const access = accesses.find(({ tenant }) => tenant.id === selection?.tenantId) ?? null;
    const location = locations.find(({ id }) => id === selection?.locationId) ?? null;
    return {
      accesses,
      locations,
      tenant: access?.tenant ?? null,
      membership: access?.membership ?? null,
      location,
      loading,
      error,
      selectContext,
    };
  }, [accesses, locations, selection, loading, error, selectContext]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const value = useContext(TenantContext);
  if (!value) throw new Error("useTenant must be used inside TenantProvider.");
  return value;
}
