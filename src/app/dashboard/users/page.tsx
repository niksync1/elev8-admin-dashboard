"use client";

import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInviteUser, useResetPassword, useUpdateTenantUser, useUsers } from "@/hooks/useUsers";
import type { ManageableTenantRole, TenantUser } from "@/types/user";

const roles: Array<{ value: ManageableTenantRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "warehouse", label: "Warehouse" },
  { value: "viewer", label: "Viewer" },
];

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "The operation failed.";
}

function LocationChoices({ selected, onChange, disabled = false }: {
  selected: string[]; onChange: (ids: string[]) => void; disabled?: boolean;
}) {
  const { tenant, locations } = useTenant();
  const available = locations.filter((location) => location.tenant_id === tenant?.id);
  return (
    <div className="flex flex-wrap gap-3">
      {available.map((location) => (
        <label key={location.id} className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" disabled={disabled} checked={selected.includes(location.id)}
            onChange={(event) => onChange(event.target.checked
              ? [...selected, location.id]
              : selected.filter((id) => id !== location.id))}
            className="h-4 w-4 rounded border-gray-300 text-blue-600" />
          {location.name}
        </label>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const { tenant, membership, locations } = useTenant();
  const { data: users, isLoading, error: loadError } = useUsers();
  const inviteUser = useInviteUser();
  const updateUser = useUpdateTenantUser();
  const resetPassword = useResetPassword();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ManageableTenantRole>("warehouse");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<TenantUser | null>(null);
  const [editRole, setEditRole] = useState<ManageableTenantRole>("warehouse");
  const [editLocations, setEditLocations] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const tenantLocations = locations.filter((location) => location.tenant_id === tenant?.id);
  const locationName = new Map(tenantLocations.map((location) => [location.id, location.name]));
  const inviteLocations = role === "admin" ? tenantLocations.map(({ id }) => id) : locationIds;

  if (membership?.role !== "owner") {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">Only the tenant owner can manage users.</div>;
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault(); setFeedback(null);
    try {
      const result = await inviteUser.mutateAsync({ email: email.trim(), role, locationIds: inviteLocations });
      setFeedback({ type: "success", text: result.message ?? "User access created." });
      setEmail(""); setRole("warehouse"); setLocationIds([]);
    } catch (error) { setFeedback({ type: "error", text: messageOf(error) }); }
  }

  function beginEdit(user: TenantUser) {
    if (user.role === "owner") return;
    setEditing(user); setEditRole(user.role); setEditLocations(user.locationIds); setFeedback(null);
  }

  async function saveEdit() {
    if (!editing) return;
    const selected = editRole === "admin" ? tenantLocations.map(({ id }) => id) : editLocations;
    try {
      const result = await updateUser.mutateAsync({ userId: editing.userId, role: editRole, locationIds: selected });
      setFeedback({ type: "success", text: result.message ?? "User access updated." }); setEditing(null);
    } catch (error) { setFeedback({ type: "error", text: messageOf(error) }); }
  }

  async function reset(user: TenantUser) {
    setFeedback(null); setResetLink(null);
    try {
      const result = await resetPassword.mutateAsync({ userId: user.userId });
      setResetLink(result.link ?? null);
      setFeedback({ type: "success", text: `Recovery link generated for ${user.email}.` });
    } catch (error) { setFeedback({ type: "error", text: messageOf(error) }); }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">Manage roles and location access for {tenant?.name}</p></div>

      <Card><CardHeader><CardTitle>Invite or add user</CardTitle></CardHeader><CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="role">Tenant role</Label>
              <select id="role" value={role} onChange={(event) => { setRole(event.target.value as ManageableTenantRole); setLocationIds([]); }} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">
                {roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select></div>
          </div>
          <div className="space-y-2"><Label>Location access</Label>
            {role === "admin" ? <p className="text-sm text-gray-500">Admins have access to every active location.</p> : <LocationChoices selected={locationIds} onChange={setLocationIds} />}
          </div>
          <Button type="submit" loading={inviteUser.isPending}>Invite user</Button>
        </form>
      </CardContent></Card>

      {feedback && <div className={`rounded-lg border px-4 py-3 text-sm ${feedback.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{feedback.text}</div>}
      {resetLink && <Card><CardHeader><CardTitle>Password recovery link</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-sm text-gray-500">Share this one-time link securely with the member.</p>
        <div className="flex gap-2"><Input readOnly value={resetLink} /><Button type="button" onClick={() => void navigator.clipboard.writeText(resetLink)}>Copy</Button></div>
      </CardContent></Card>}

      <Card><CardHeader><CardTitle>Tenant members</CardTitle></CardHeader><CardContent className="p-0">
        {isLoading ? <div className="p-6 text-sm text-gray-500">Loading members...</div>
          : loadError ? <div className="p-6 text-sm text-red-600">{messageOf(loadError)}</div>
          : !users?.length ? <div className="p-6 text-sm text-gray-500">No members found.</div>
          : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200">
            <th className="px-6 py-4 text-left font-medium text-gray-500">Member</th><th className="px-6 py-4 text-left font-medium text-gray-500">Role</th>
            <th className="px-6 py-4 text-left font-medium text-gray-500">Locations</th><th className="px-6 py-4 text-left font-medium text-gray-500">Status</th>
            <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th></tr></thead><tbody>
            {users.map((user) => <tr key={user.userId} className="border-b border-gray-100 align-top">
              <td className="px-6 py-4"><p className="font-medium text-gray-900">{user.email}</p><p className="text-gray-500">{user.name ?? "—"}</p></td>
              <td className="px-6 py-4"><Badge variant={user.role === "owner" || user.role === "admin" ? "purple" : "default"}>{user.role}</Badge></td>
              <td className="px-6 py-4 text-gray-600">{user.role === "owner" || user.role === "admin" ? "All locations" : user.locationIds.map((id) => locationName.get(id)).filter(Boolean).join(", ") || "None"}</td>
              <td className="px-6 py-4"><Badge variant={user.status === "active" ? "success" : "gray"}>{user.status}</Badge></td>
              <td className="px-6 py-4"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" loading={resetPassword.isPending} onClick={() => void reset(user)}>Reset password</Button>
                {user.role !== "owner" && <Button size="sm" variant="outline" onClick={() => beginEdit(user)}>Edit access</Button>}</div></td>
            </tr>)}</tbody></table></div>}
      </CardContent></Card>

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Edit {editing.email}</h2><div className="mt-4 space-y-4">
          <div className="space-y-1"><Label htmlFor="edit-role">Tenant role</Label><select id="edit-role" value={editRole} onChange={(event) => { setEditRole(event.target.value as ManageableTenantRole); setEditLocations([]); }} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div className="space-y-2"><Label>Location access</Label>{editRole === "admin" ? <p className="text-sm text-gray-500">Admins have access to every active location.</p> : <LocationChoices selected={editLocations} onChange={setEditLocations} />}</div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button loading={updateUser.isPending} onClick={() => void saveEdit()}>Save access</Button></div>
        </div></div></div>}
    </div>
  );
}
