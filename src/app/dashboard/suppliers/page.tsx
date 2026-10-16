"use client";

import { useCallback, useEffect, useState } from "react";

type Tenant = { id: string; name: string };
type Supplier = {
  id: string;
  tenant_id: string;
  supplier_type: "business" | "individual";
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_reference: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
};

type FormState = {
  supplierType: "business" | "individual";
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxReference: string;
  paymentTerms: string;
  notes: string;
};

const emptyForm: FormState = {
  supplierType: "business",
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  taxReference: "",
  paymentTerms: "",
  notes: "",
};

export default function SuppliersPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSuppliers = useCallback(async (selectedTenantId: string) => {
    if (!selectedTenantId) {
      setSuppliers([]);
      return;
    }
    const response = await fetch(`/api/suppliers?tenantId=${encodeURIComponent(selectedTenantId)}`, { cache: "no-store" });
    const data = await response.json() as { suppliers?: Supplier[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Unable to load suppliers.");
    setSuppliers(data.suppliers ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadTenants() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/suppliers", { cache: "no-store" });
        const data = await response.json() as { tenants?: Tenant[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Unable to load authorized tenants.");
        if (!active) return;
        const nextTenants = data.tenants ?? [];
        setTenants(nextTenants);
        setTenantId(current => current && nextTenants.some(tenant => tenant.id === current) ? current : (nextTenants[0]?.id ?? ""));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load tenants.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTenants();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void loadSuppliers(tenantId)
      .catch(caught => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load suppliers."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenantId, loadSuppliers]);

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({
      supplierType: supplier.supplier_type,
      name: supplier.name,
      contactPerson: supplier.contact_person ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      taxReference: supplier.tax_reference ?? "",
      paymentTerms: supplier.payment_terms ?? "",
      notes: supplier.notes ?? "",
    });
    setNotice("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) {
      setError("Select an authorized tenant first.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/suppliers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...(editingId ? { id: editingId } : {}), ...form }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save supplier.");
      resetForm();
      await loadSuppliers(tenantId);
      setNotice(editingId ? "Supplier details updated." : "Supplier created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save supplier.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateSupplier(supplier: Supplier) {
    if (!tenantId || !window.confirm(`Deactivate ${supplier.name}? Existing purchase orders and payments will be preserved.`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/suppliers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, id: supplier.id }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to deactivate supplier.");
      await loadSuppliers(tenantId);
      setNotice("Supplier deactivated. Existing purchasing history was preserved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to deactivate supplier.");
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <p className="mt-1 text-sm text-gray-500">Manage business and individual suppliers. Mobile inventory users can only select existing suppliers.</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <label htmlFor="supplier-tenant" className="block text-sm font-medium text-gray-700">Tenant</label>
        <select id="supplier-tenant" value={tenantId} onChange={event => { setTenantId(event.target.value); resetForm(); }} className="mt-2 w-full max-w-lg rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
        {!tenants.length && !loading ? <p className="mt-3 text-sm text-gray-500">No tenant memberships with supplier-management access were found for this account.</p> : null}
      </section>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p> : null}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit supplier" : "Add supplier"}</h2>
        <form onSubmit={saveSupplier} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="supplier-type" className="block text-sm font-medium text-gray-700">Supplier type</label>
            <select id="supplier-type" value={form.supplierType} onChange={event => setForm(current => ({ ...current, supplierType: event.target.value as FormState["supplierType"] }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="business">Business</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          <Field label="Supplier name *" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} required maxLength={160} />
          <Field label="Contact person" value={form.contactPerson} onChange={value => setForm(current => ({ ...current, contactPerson: value }))} maxLength={160} />
          <Field label="Phone" value={form.phone} onChange={value => setForm(current => ({ ...current, phone: value }))} maxLength={80} />
          <Field label="Email" value={form.email} onChange={value => setForm(current => ({ ...current, email: value }))} type="email" maxLength={254} />
          <Field label="Tax reference" value={form.taxReference} onChange={value => setForm(current => ({ ...current, taxReference: value }))} maxLength={120} />
          <Field label="Payment terms" value={form.paymentTerms} onChange={value => setForm(current => ({ ...current, paymentTerms: value }))} maxLength={160} placeholder="e.g. cash, 30 days" />
          <div className="md:col-span-2">
            <label htmlFor="supplier-address" className="block text-sm font-medium text-gray-700">Address</label>
            <textarea id="supplier-address" value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="supplier-notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea id="supplier-notes" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div className="flex gap-3 md:col-span-2">
            <button disabled={saving || !tenantId} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save changes" : "Create supplier"}</button>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel edit</button> : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Supplier directory</h2>
          <p className="mt-1 text-sm text-gray-500">{suppliers.length} supplier(s)</p>
        </div>
        {loading ? <p className="p-5 text-sm text-gray-500">Loading suppliers…</p> : !suppliers.length ? <p className="p-5 text-sm text-gray-500">No suppliers have been added for this tenant.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Supplier</th><th className="px-4 py-3 font-medium">Type / contact</th><th className="px-4 py-3 font-medium">Payment terms</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>{suppliers.map(supplier => <tr key={supplier.id} className="border-b border-gray-100 align-top">
                <td className="px-4 py-3"><p className="font-medium text-gray-900">{supplier.name}</p><p className="mt-1 text-xs text-gray-500">{supplier.phone || "No phone"}{supplier.email ? ` · ${supplier.email}` : ""}</p></td>
                <td className="px-4 py-3 text-gray-600">{supplier.supplier_type === "business" ? "Business" : "Individual"}{supplier.contact_person ? ` · ${supplier.contact_person}` : ""}</td>
                <td className="px-4 py-3 text-gray-600">{supplier.payment_terms || "—"}</td>
                <td className="px-4 py-3"><span className={supplier.is_active ? "rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700" : "rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"}>{supplier.is_active ? "Active" : "Inactive"}</span></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-3"><button onClick={() => startEdit(supplier)} className="font-medium text-blue-700 hover:underline">Edit</button>{supplier.is_active ? <button onClick={() => void deactivateSupplier(supplier)} className="font-medium text-red-700 hover:underline">Deactivate</button> : null}</div></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, maxLength, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} required={required} maxLength={maxLength} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
  </div>;
}
