"use client";

import { useTenant } from "@/components/TenantProvider";

export function DashboardShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const { loading, error, tenant, location } = useTenant();

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading business access...</div>;
  }

  if (error) {
    return <div className="mx-auto mt-20 max-w-lg rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }

  if (!tenant || !location) {
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Your account has no active business location. Ask the business owner to assign access.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {sidebar}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
