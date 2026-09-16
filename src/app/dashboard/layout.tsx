import { Sidebar } from "@/components/Sidebar";
import { DashboardShell } from "@/components/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell sidebar={<Sidebar />}>{children}</DashboardShell>
  );
}
