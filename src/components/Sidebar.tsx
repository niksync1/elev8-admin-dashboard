"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getBrowserClient } from "@/lib/supabase";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { useTenant } from "@/components/TenantProvider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/products", label: "Products", icon: "📦" },
  { href: "/dashboard/categories", label: "Categories", icon: "🏷️" },
  { href: "/dashboard/users", label: "Users", icon: "👥" },
  { href: "/dashboard/reports", label: "Reports", icon: "📈" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { membership } = useTenant();
  const visibleNavItems = navItems.filter(
    (item) => item.href !== "/dashboard/users" || membership?.role === "owner"
  );

  async function handleLogout() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-lg font-bold text-gray-900">Inventory Admin</h1>
      </div>
      <TenantSwitcher />

      <nav className="flex-1 space-y-1 p-4">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <span className="text-lg">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
