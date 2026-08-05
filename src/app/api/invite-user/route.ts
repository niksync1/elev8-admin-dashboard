import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    // --- Authorization: only admins can invite users ---
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    // --- Validate request body ---
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required." },
        { status: 400 }
      );
    }

    if (!["warehouse", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'warehouse' or 'admin'." },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // Send an invite email to the user. This creates the user (if not exists)
    // and emails them a link to set their password.
    const origin = new URL(request.url).origin;
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { role },
        redirectTo: `${origin}/update-password`,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "User invited successfully! They will receive an email to set their password.",
      user: data.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}