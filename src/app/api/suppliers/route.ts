import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase";

type SupplierInput = {
  tenantId?: unknown;
  id?: unknown;
  supplierType?: unknown;
  name?: unknown;
  contactPerson?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  taxReference?: unknown;
  paymentTerms?: unknown;
  notes?: unknown;
};

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) return undefined;
  return value.trim() || null;
}

async function authorizeDashboardAdmin() {
  const sessionClient = await getServerClient();
  const { data: { user }, error: userError } = await sessionClient.auth.getUser();
  if (userError || !user) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  }

  const { data: profile, error: profileError } = await sessionClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin dashboard access required." }, { status: 403 }) } as const;
  }

  const adminClient = getAdminClient();
  const { data: memberships, error: membershipError } = await adminClient
    .from("tenant_memberships")
    .select("tenant_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);

  if (membershipError) {
    return { response: NextResponse.json({ error: "Unable to verify tenant access." }, { status: 500 }) } as const;
  }

  return {
    adminClient,
    userId: user.id,
    tenantIds: (memberships ?? []).map((membership) => membership.tenant_id as string),
  } as const;
}

async function authorizeTenant(tenantId: unknown) {
  const context = await authorizeDashboardAdmin();
  if ("response" in context) return context;
  if (typeof tenantId !== "string" || !context.tenantIds.includes(tenantId)) {
    return { response: NextResponse.json({ error: "You are not authorized to manage suppliers for this tenant." }, { status: 403 }) } as const;
  }
  return context;
}

function parseSupplier(input: SupplierInput) {
  if (input.supplierType !== "business" && input.supplierType !== "individual") {
    return { error: "Supplier type must be business or individual." } as const;
  }
  if (typeof input.name !== "string" || input.name.trim().length < 1 || input.name.trim().length > 160) {
    return { error: "Supplier name must contain 1–160 characters." } as const;
  }

  const contactPerson = optionalText(input.contactPerson, 160);
  const phone = optionalText(input.phone, 80);
  const email = optionalText(input.email, 254);
  const address = optionalText(input.address, 500);
  const taxReference = optionalText(input.taxReference, 120);
  const paymentTerms = optionalText(input.paymentTerms, 160);
  const notes = optionalText(input.notes, 2000);
  if ([contactPerson, phone, email, address, taxReference, paymentTerms, notes].includes(undefined)) {
    return { error: "One or more supplier fields are invalid or too long." } as const;
  }

  return {
    value: {
      supplier_type: input.supplierType,
      name: input.name.trim(),
      contact_person: contactPerson,
      phone,
      email,
      address,
      tax_reference: taxReference,
      payment_terms: paymentTerms,
      notes,
      updated_at: new Date().toISOString(),
    },
  } as const;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId");
    const context = await authorizeDashboardAdmin();
    if ("response" in context) return context;

    if (!tenantId) {
      const { data: tenants, error } = await context.adminClient
        .from("tenants")
        .select("id,name")
        .in("id", context.tenantIds)
        .order("name");
      if (error) return NextResponse.json({ error: "Unable to load authorized tenants." }, { status: 500 });
      return NextResponse.json({ tenants: tenants ?? [] });
    }

    if (!context.tenantIds.includes(tenantId)) {
      return NextResponse.json({ error: "You are not authorized to view suppliers for this tenant." }, { status: 403 });
    }

    const { data: suppliers, error } = await context.adminClient
      .from("suppliers")
      .select("id,tenant_id,supplier_type,name,contact_person,phone,email,address,tax_reference,payment_terms,notes,is_active,created_at,updated_at")
      .eq("tenant_id", tenantId)
      .order("name");
    if (error) return NextResponse.json({ error: "Unable to load suppliers." }, { status: 500 });
    return NextResponse.json({ suppliers: suppliers ?? [] });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as SupplierInput;
    const context = await authorizeTenant(input.tenantId);
    if ("response" in context) return context;

    const parsed = parseSupplier(input);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { data, error } = await context.adminClient
      .from("suppliers")
      .insert({ ...parsed.value, tenant_id: input.tenantId, created_by: context.userId, is_active: true })
      .select("id,tenant_id,supplier_type,name,contact_person,phone,email,address,tax_reference,payment_terms,notes,is_active,created_at,updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "A supplier with this name already exists in this tenant." : "Unable to create supplier." }, { status: error.code === "23505" ? 409 : 500 });
    return NextResponse.json({ supplier: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request or unexpected server error." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const input = await request.json() as SupplierInput;
    if (typeof input.id !== "string" || !input.id) {
      return NextResponse.json({ error: "Supplier ID is required." }, { status: 400 });
    }
    const context = await authorizeTenant(input.tenantId);
    if ("response" in context) return context;

    const parsed = parseSupplier(input);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { data, error } = await context.adminClient
      .from("suppliers")
      .update(parsed.value)
      .eq("tenant_id", input.tenantId as string)
      .eq("id", input.id)
      .select("id,tenant_id,supplier_type,name,contact_person,phone,email,address,tax_reference,payment_terms,notes,is_active,created_at,updated_at")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "A supplier with this name already exists in this tenant." : "Unable to update supplier." }, { status: error.code === "23505" ? 409 : 500 });
    if (!data) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    return NextResponse.json({ supplier: data });
  } catch {
    return NextResponse.json({ error: "Invalid request or unexpected server error." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const input = await request.json() as { tenantId?: unknown; id?: unknown };
    if (typeof input.id !== "string" || !input.id) {
      return NextResponse.json({ error: "Supplier ID is required." }, { status: 400 });
    }
    const context = await authorizeTenant(input.tenantId);
    if ("response" in context) return context;

    const { data, error } = await context.adminClient
      .from("suppliers")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("tenant_id", input.tenantId as string)
      .eq("id", input.id)
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to deactivate supplier." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    return NextResponse.json({ message: "Supplier deactivated." });
  } catch {
    return NextResponse.json({ error: "Invalid request or unexpected server error." }, { status: 400 });
  }
}
