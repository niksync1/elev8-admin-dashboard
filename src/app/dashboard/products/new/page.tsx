"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const { data: categories } = useCategories();

  const [form, setForm] = useState({
    name: "",
    barcode: "",
    description: "",
    price: "",
    compare_at_price: "",
    category: "",
    is_active: true,
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
      await createProduct.mutateAsync({
        name: form.name,
        barcode: form.barcode,
        description: form.description || undefined,
        price,
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : undefined,
        category: form.category || undefined,
      });
      router.push("/dashboard/products");
    } catch (err: any) {
      setError(err.message || "Failed to create product.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
        <p className="mt-1 text-sm text-gray-500">Create a new product in your catalog</p>
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
                  placeholder="Product name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode *</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="EAN-13 or UPC"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Product description (optional)"
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
                  placeholder="0.00"
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
                  placeholder="0.00"
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
              <div className="flex items-end text-sm text-gray-500">
                New products start at zero stock. Receive stock through an inventory transaction.
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={createProduct.isPending}>
                Create Product
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/products")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
