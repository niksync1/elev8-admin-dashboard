"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardSummary, useRecentTransactions } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: transactions, isLoading: txLoading, isError: txError } = useRecentTransactions(10);

  const statCards = [
    { label: "Total Products", value: summary?.totalProducts ?? 0, color: "bg-blue-500" },
    { label: "Low Stock Items", value: summary?.lowStockCount ?? 0, color: "bg-red-500" },
    { label: "Categories", value: summary?.totalCategories ?? 0, color: "bg-purple-500" },
    { label: "Transactions", value: summary?.recentTransactions ?? 0, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your inventory</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <span className="text-xl text-white font-bold">
                    {summaryLoading ? "..." : stat.value}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summaryLoading ? "..." : stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <p className="text-sm text-gray-500">Loading transactions...</p>
          ) : txError ? (
            <p className="text-sm text-red-600">
              Failed to load recent transactions. Please check your connection and try again.
            </p>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-gray-900">
                        {tx.products?.name ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            tx.transaction_type === "RECEIPT" ? "success" :
                            tx.transaction_type === "SALE" ? "danger" :
                            tx.transaction_type === "DAMAGE" ? "warning" :
                            "default"
                          }
                        >
                          {tx.transaction_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={tx.quantity > 0 ? "text-green-600" : "text-red-600"}>
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString()}
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