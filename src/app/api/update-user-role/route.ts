import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";
import { errorMessage, requireTenantOwner } from "@/lib/tenant-admin-server";

const schema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "manager", "warehouse", "viewer"]),
  locationIds: z.array(z.string().uuid()).max(100),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid membership details." }, { status: 400 });
    const { tenantId, userId, role } = parsed.data;
    const locationIds = [...new Set(parsed.data.locationIds)];
    if (role !== "admin" && locationIds.length === 0) {
      return NextResponse.json({ error: "Select at least one location for this role." }, { status: 400 });
    }
    const authorization = await requireTenantOwner(tenantId);
    if ("error" in authorization) return authorization.error;
    if (authorization.user.id === userId) {
      return NextResponse.json({ error: "Owners cannot change their own owner membership here." }, { status: 400 });
    }

    const admin = getAdminClient();
    const current = await admin.from("tenant_memberships").select("role,status")
      .eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) return NextResponse.json({ error: "Tenant membership not found." }, { status: 404 });
    if (current.data.role === "owner") {
      return NextResponse.json({ error: "Owner memberships are protected." }, { status: 400 });
    }

    if (locationIds.length) {
      const locations = await admin.from("locations").select("id")
        .eq("tenant_id", tenantId).eq("is_active", true).in("id", locationIds);
      if (locations.error) throw locations.error;
      if ((locations.data ?? []).length !== locationIds.length) {
        return NextResponse.json({ error: "One or more locations are not active in this business." }, { status: 400 });
      }
    }

    const previousAssignments = await admin.from("location_memberships").select("location_id")
      .eq("tenant_id", tenantId).eq("user_id", userId);
    if (previousAssignments.error) throw previousAssignments.error;
    const roleUpdate = await admin.from("tenant_memberships").update({ role })
      .eq("tenant_id", tenantId).eq("user_id", userId);
    if (roleUpdate.error) throw roleUpdate.error;
    const removeAssignments = await admin.from("location_memberships").delete()
      .eq("tenant_id", tenantId).eq("user_id", userId);
    if (removeAssignments.error) throw removeAssignments.error;

    if (locationIds.length) {
      const addAssignments = await admin.from("location_memberships").insert(
        locationIds.map((locationId) => ({ tenant_id: tenantId, location_id: locationId, user_id: userId }))
      );
      if (addAssignments.error) {
        await admin.from("tenant_memberships").update({ role: current.data.role })
          .eq("tenant_id", tenantId).eq("user_id", userId);
        const oldLocationIds = (previousAssignments.data ?? []).map((row) => row.location_id);
        if (oldLocationIds.length) {
          await admin.from("location_memberships").insert(oldLocationIds.map((locationId) => ({
            tenant_id: tenantId, location_id: locationId, user_id: userId,
          })));
        }
        throw addAssignments.error;
      }
    }
    return NextResponse.json({ message: "Tenant role and location access updated." });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
