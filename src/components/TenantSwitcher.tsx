"use client";

import { useTenant } from "@/components/TenantProvider";

export function TenantSwitcher() {
  const { accesses, locations, tenant, location, selectContext } = useTenant();
  if (!tenant || !location) return null;

  const tenantLocations = locations.filter((item) => item.tenant_id === tenant.id);

  return (
    <div className="space-y-2 border-b border-gray-200 p-4">
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
        Business
      </label>
      <select
        aria-label="Business"
        className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
        value={tenant.id}
        onChange={(event) => selectContext(event.target.value)}
      >
        {accesses.map((access) => (
          <option key={access.tenant.id} value={access.tenant.id}>
            {access.tenant.name}
          </option>
        ))}
      </select>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
        Location
      </label>
      <select
        aria-label="Location"
        className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
        value={location.id}
        onChange={(event) => selectContext(tenant.id, event.target.value)}
      >
        {tenantLocations.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}
