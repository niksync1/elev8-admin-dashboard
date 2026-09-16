import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";
import { errorMessage, requireTenantOwner } from "@/lib/tenant-admin-server";

const schema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(["admin", "manager", "warehouse", "viewer"]),
  locationIds: z.array(z.string().uuid()).max(100),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid invitation details." }, { status: 400 });
    const { tenantId, email, role } = parsed.data;
    const locationIds = [...new Set(parsed.data.locationIds)];
    if (role !== "admin" && locationIds.length === 0) {
      return NextResponse.json({ error: "Select at least one location for this role." }, { status: 400 });
    }
    const authorization = await requireTenantOwner(tenantId);
    if ("error" in authorization) return authorization.error;

    const admin = getAdminClient();
    if (locationIds.length) {
      const locations = await admin.from("locations").select("id")
        .eq("tenant_id", tenantId).eq("is_active", true).in("id", locationIds);
      if (locations.error) throw locations.error;
      if ((locations.data ?? []).length !== locationIds.length) {
        return NextResponse.json({ error: "One or more locations are not active in this business." }, { status: 400 });
      }
    }

    const existingProfile = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    if (existingProfile.error) throw existingProfile.error;
    let userId = existingProfile.data?.id;
    let createdUser = false;
    if (!userId) {
      const origin = new URL(request.url).origin;
      const invitation = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/update-password`,
      });
      if (invitation.error) return NextResponse.json({ error: invitation.error.message }, { status: 400 });
      userId = invitation.data.user.id;
      createdUser = true;
    }

    const existingMembership = await admin.from("tenant_memberships").select("user_id")
      .eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
    if (existingMembership.error) throw existingMembership.error;
    if (existingMembership.data) {
      return NextResponse.json({ error: "This user already belongs to the business." }, { status: 409 });
    }

    const membership = await admin.from("tenant_memberships").insert({
      tenant_id: tenantId, user_id: userId, role, status: "active",
    });
    if (membership.error) {
      if (createdUser) await admin.auth.admin.deleteUser(userId);
      throw membership.error;
    }
    if (locationIds.length) {
      const assignments = await admin.from("location_memberships").insert(
        locationIds.map((locationId) => ({ tenant_id: tenantId, location_id: locationId, user_id: userId }))
      );
      if (assignments.error) {
        if (createdUser) await admin.auth.admin.deleteUser(userId);
        else await admin.from("tenant_memberships").delete().eq("tenant_id", tenantId).eq("user_id", userId);
        throw assignments.error;
      }
    }
    return NextResponse.json({
      message: createdUser ? "Invitation sent and tenant access assigned." : "Existing account added to the business.",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
