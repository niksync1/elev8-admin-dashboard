import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";
import { errorMessage, requireTenantOwner } from "@/lib/tenant-admin-server";

const schema = z.object({ tenantId: z.string().uuid(), userId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid password-reset request." }, { status: 400 });
    const { tenantId, userId } = parsed.data;
    const authorization = await requireTenantOwner(tenantId);
    if ("error" in authorization) return authorization.error;

    const admin = getAdminClient();
    const membership = await admin.from("tenant_memberships").select("user_id")
      .eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
    if (membership.error) throw membership.error;
    if (!membership.data) return NextResponse.json({ error: "Tenant membership not found." }, { status: 404 });
    const profile = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
    if (profile.error) throw profile.error;
    if (!profile.data?.email) return NextResponse.json({ error: "The member has no email address." }, { status: 400 });

    const origin = new URL(request.url).origin;
    const result = await admin.auth.admin.generateLink({
      type: "recovery", email: profile.data.email,
      options: { redirectTo: `${origin}/update-password` },
    });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
    return NextResponse.json({
      message: "Password recovery link generated.",
      link: result.data.properties.action_link,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
