"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: product, isLoading } = useProduct(id);
  const { data: categories } = useCategories();

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading product...</div>;
  }

  if (!product) {
    return <div className="text-sm text-red-500">Product not found.</div>;
  }

  // Keying the form by product id resets its state automatically when the
  // loaded product changes, avoiding a setState-in-effect sync.
  return (
    <ProductEditForm
      key={product.id}
      product={product}
      categories={categories ?? []}
    />
  );
}

function ProductEditForm({
  product,
  categories,
}: {
  product: Product;
  categories: Category[];
}) {
  const router = useRouter();
  const updateProduct = useUpdateProduct(product.id);

  const [form, setForm] = useState({
    name: product.name ?? "",
    barcode: product.barcode ?? "",
    description: product.description ?? "",
    price: product.price?.toString() ?? "",
    compare_at_price: product.compare_at_price?.toString() ?? "",
    category: product.category ?? "",
    is_active: product.is_active ?? true,
  });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.barcode || !form.price) {
      setError("Name, barcode, and price are required.");
      return;
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid positive number.");
      return;
    }

    try {
      await updateProduct.mutateAsync({
        name: form.name,
        barcode: form.barcode,
        description: form.description || undefined,
        price,
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : undefined,
        category: form.category || undefined,
        is_active: form.is_active,
      });
      router.push("/dashboard/products");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update product.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <p className="mt-1 text-sm text-gray-500">Update product details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode *</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (GHS) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_at_price">Compare at Price</Label>
                <Input
                  id="compare_at_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.compare_at_price}
                  onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">No category</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                  {product.stock_quantity}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <Label htmlFor="is_active" className="mb-0">Product is active</Label>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={updateProduct.isPending}>
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/products")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}