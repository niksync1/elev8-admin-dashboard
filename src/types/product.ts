export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  barcode: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  stock_quantity: number;
  location_quantity?: number;
  category?: string;
  images: string[];
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  barcode: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  category?: string;
  images?: string[];
  metadata?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}
