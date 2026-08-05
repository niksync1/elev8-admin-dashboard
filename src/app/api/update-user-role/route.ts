import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    // --- Authorization: only admins can change user roles ---
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
    const { userId, role } = await request.json();

    if (!userId || (role !== "warehouse" && role !== "admin")) {
      return NextResponse.json(
        { error: "userId and a valid role (warehouse | admin) are required." },
        { status: 400 }
      );
    }

    // --- Update the user's role ---
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User role updated successfully." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}