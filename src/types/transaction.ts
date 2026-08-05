export interface InventoryTransaction {
  id: string;
  product_id: string;
  quantity: number;
  transaction_type: string;
  remarks?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  totalProducts: number;
  lowStockCount: number;
  totalCategories: number;
  recentTransactions: number;
}