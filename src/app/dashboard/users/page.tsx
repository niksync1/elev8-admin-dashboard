"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUsers, useUpdateUserRole, useResetPassword } from "@/hooks/useUsers";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const resetPassword = useResetPassword();
  const { role: currentUserRole } = useCurrentUser();
  const isAdmin = currentUserRole === "admin";

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"warehouse" | "admin">("warehouse");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");

    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }

    setInviteLoading(true);

    try {
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to invite user.");
      }

      setInviteEmail("");
      setInviteRole("warehouse");
      setActionMessage({
        type: "success",
        text: `Invite sent to ${inviteEmail.trim()}. They will receive an email to set their password.`,
      });
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  function handleResetPassword(email: string) {
    setActionMessage(null);
    setLinkCopied(false);
    setResetEmail(email);
    resetPassword.mutate(
      { email },
      {
        onSuccess: (data) => {
          setActionMessage({
            type: "success",
            text: `Password reset email sent to ${email}.`,
          });
          // Hybrid: show the generated link as a fallback so the admin can share it
          if (data.link) {
            setResetLink(data.link);
          }
          setResetEmail(null);
        },
        onError: (err: any) => {
          setActionMessage({
            type: "error",
            text: err.message || "Failed to send password reset email.",
          });
          setResetEmail(null);
        },
      }
    );
  }

  async function copyResetLink() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = resetLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">Manage warehouse and admin users</p>
      </div>

      {/* Invite User Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="w-40 space-y-1">
              <Label htmlFor="inviteRole">Role</Label>
              <select
                id="inviteRole"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "warehouse" | "admin")}
              >
                <option value="warehouse">Warehouse</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" loading={inviteLoading}>
              Invite
            </Button>
          </form>
          {inviteError && (
            <p className="mt-2 text-sm text-red-600">{inviteError}</p>
          )}
        </CardContent>
      </Card>

      {/* Action feedback */}
      {actionMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            actionMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Reset link modal */}
      {resetLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Password Reset Link</h3>
            <p className="mt-1 text-sm text-gray-500">
              A reset email was sent to the user. Use this link as a fallback if they don't receive it.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Input value={resetLink} readOnly className="text-xs" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setResetLink(null)}
              >
                Close
              </Button>
              <Button onClick={copyResetLink}>
                {linkCopied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading users...</div>
          ) : !users || users.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Email</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Role</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Joined</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 text-gray-600">{user.name ?? "—"}</td>
                      <td className="px-6 py-4">
                        <Badge variant={user.role === "admin" ? "purple" : "default"}>
                          {user.role === "admin" ? "Admin" : "Warehouse"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            loading={resetEmail === user.email && resetPassword.isPending}
                            onClick={() => handleResetPassword(user.email)}
                          >
                            Reset Password
                          </Button>
                          {isAdmin &&
                            (user.role === "warehouse" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                loading={updateRole.isPending}
                                onClick={() =>
                                  updateRole.mutate({ userId: user.id, role: "admin" })
                                }
                              >
                                Make Admin
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                loading={updateRole.isPending}
                                onClick={() =>
                                  updateRole.mutate({ userId: user.id, role: "warehouse" })
                                }
                              >
                                Make Warehouse
                              </Button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}