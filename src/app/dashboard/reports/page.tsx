"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSummary, useRecentTransactions } from "@/hooks/useDashboard";
import { useProducts } from "@/hooks/useProducts";

export default function ReportsPage() {
  const { data: summary } = useDashboardSummary();
  const { data: products, isError: productsError } = useProducts();
  const { data: transactions, isError: txError } = useRecentTransactions(50);

  const totalStockValue = (products ?? []).reduce(
    (sum, p) => sum + p.price * (p.location_quantity ?? 0),
    0
  );

  const lowStockProducts = (products ?? []).filter(
    (p) => (p.location_quantity ?? 0) <= 5 && (p.location_quantity ?? 0) > 0
  );

  const outOfStockProducts = (products ?? []).filter(
    (p) => (p.location_quantity ?? 0) === 0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Inventory analytics and insights</p>
      </div>

      {/* Summary Cards */}
      {productsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load products for this location. Please refresh and try again.
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Stock Value</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              GHS {totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{lowStockProducts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Out of Stock</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Transactions</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {summary?.recentTransactions ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alert</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lowStockProducts.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No products are low on stock.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Product</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Stock</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100">
                      <td className="px-6 py-4 text-gray-900">{p.name}</td>
                      <td className="px-6 py-4 text-right font-medium text-red-600">
                        {p.location_quantity ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        GHS {(p.price * (p.location_quantity ?? 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txError ? (
            <div className="p-6 text-sm text-red-600">
              Failed to load recent transactions. Please check your connection and try again.
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No transactions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Product</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Type</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Qty</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100">
                      <td className="px-6 py-4 text-gray-900">
                        {tx.products?.name ?? "Unknown"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        <span className={tx.quantity > 0 ? "text-green-600" : "text-red-600"}>
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
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
