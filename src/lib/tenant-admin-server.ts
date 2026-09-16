import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase-server";

export async function requireTenantOwner(tenantId: string) {
  const supabase = await getServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) } as const;
  }
  const { data: membership, error: membershipError } = await supabase
    .from("tenant_memberships")
    .select("tenant_id,user_id,role,status")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("role", "owner")
    .eq("status", "active")
    .maybeSingle();
  if (membershipError || !membership) {
    return { error: NextResponse.json(
      { error: "Forbidden. Active tenant-owner access is required." },
      { status: 403 }
    ) } as const;
  }
  return { user, supabase } as const;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal server error.";
}
