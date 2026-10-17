export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  image_url?: string;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;