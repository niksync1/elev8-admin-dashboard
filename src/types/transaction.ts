export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  location_id: string;
  product_id: string;
  quantity: number;
  transaction_type: string;
  remarks?: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolvedInventoryTransaction extends InventoryTransaction {
  products: { name: string } | null;
  performed_by: string;
}

export interface DashboardSummary {
  totalProducts: number;
  lowStockCount: number;
  totalCategories: number;
  recentTransactions: number;
}
