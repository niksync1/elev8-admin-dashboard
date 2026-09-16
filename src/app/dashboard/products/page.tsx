"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useProducts(search);
  const deleteProduct = useDeleteProduct();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product catalog</p>
        </div>
        <Link href="/dashboard/products/new">
          <Button>+ Add Product</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by name, barcode, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading products...</div>
          ) : !products || products.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              {search ? "No products match your search." : "No products yet. Add your first product."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Barcode</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-500">Category</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Price</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Stock</th>
                    <th className="px-6 py-4 text-center font-medium text-gray-500">Status</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">{product.barcode}</td>
                      <td className="px-6 py-4 text-gray-600">{product.category ?? "—"}</td>
                      <td className="px-6 py-4 text-right font-medium">
                        GHS {product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={
                            (product.location_quantity ?? 0) <= 5
                              ? "font-medium text-red-600"
                              : "text-gray-900"
                          }
                        >
                          {product.location_quantity ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={product.is_active ? "success" : "gray"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/products/${product.id}`}>
                            <Button variant="outline" size="sm">Edit</Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            loading={deleteProduct.isPending}
                            onClick={() => {
                              if (confirm("Delete this product?")) {
                                deleteProduct.mutate(product.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
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
