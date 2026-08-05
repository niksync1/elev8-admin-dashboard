import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    // --- Authorization: only admins can reset passwords ---
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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // Generate a password recovery link AND send the email automatically.
    // should_send_email: true dispatches the recovery email to the user.
    // The returned action_link is also provided so the admin can share it
    // as a fallback if the user doesn't receive the email.
    const origin = new URL(request.url).origin;
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      should_send_email: true,
      redirectTo: `${origin}/update-password`,
    } as any); // should_send_email is not in the SDK types, but GoTrue supports it

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Password reset email sent successfully.",
      link: data.properties.action_link,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}