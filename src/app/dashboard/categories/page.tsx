"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await createCategory.mutateAsync({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewName("");
      setNewDescription("");
    } catch {}
  }

  function startEdit(cat: { id: string; name: string; description?: string | null }) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;

    try {
      await updateCategory.mutateAsync({
        id,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      cancelEdit();
    } catch {}
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this category? Products in this category will not be deleted.")) {
      deleteCategory.mutate(id);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="mt-1 text-sm text-gray-500">Manage product categories</p>
      </div>

      {/* Add Category Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="newName">Name</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                required
              />
            </div>
            <div className="flex-[2] space-y-1">
              <Label htmlFor="newDescription">Description</Label>
              <Input
                id="newDescription"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <Button type="submit" loading={createCategory.isPending}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading categories...</div>
          ) : !categories || categories.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No categories yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-4 px-6 py-4">
                  {editingId === cat.id ? (
                    <>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Category name"
                        />
                      </div>
                      <div className="flex-[2] space-y-1">
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                      <Button size="sm" onClick={() => handleSaveEdit(cat.id)} loading={updateCategory.isPending}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{cat.name}</p>
                      </div>
                      <div className="flex-[2]">
                        <p className="text-sm text-gray-500">{cat.description ?? "—"}</p>
                      </div>
                      <Badge variant="gray">
                        {cat.product_count ?? 0} {(cat.product_count ?? 0) === 1 ? "product" : "products"}
                      </Badge>
                      <Badge variant={cat.is_active ? "success" : "gray"}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => startEdit(cat)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(cat.id)}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
