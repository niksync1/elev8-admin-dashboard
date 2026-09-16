import type { TenantRole } from "@/types/tenancy";

export type ManageableTenantRole = Exclude<TenantRole, "owner">;

export interface TenantUser {
  userId: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: TenantRole;
  status: "invited" | "active" | "suspended";
  locationIds: string[];
  joinedAt: string;
}

export interface InviteUserInput {
  email: string;
  role: ManageableTenantRole;
  locationIds: string[];
}
