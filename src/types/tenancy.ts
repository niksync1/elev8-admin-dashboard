export type TenantRole = "owner" | "admin" | "manager" | "warehouse" | "viewer";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: "trial" | "active" | "suspended" | "cancelled";
  plan: string;
}

export interface TenantMembership {
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  status: "invited" | "active" | "suspended";
}

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface TenantAccess {
  tenant: Tenant;
  membership: TenantMembership;
}

export interface TenantContextValue {
  accesses: TenantAccess[];
  locations: Location[];
  tenant: Tenant | null;
  membership: TenantMembership | null;
  location: Location | null;
  loading: boolean;
  error: string | null;
  selectContext: (tenantId: string, locationId?: string) => void;
}
