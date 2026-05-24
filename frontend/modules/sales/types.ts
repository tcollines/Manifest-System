export interface SalesCategory {
  id: string;
  manifest_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface SalesProduct {
  id: string;
  manifest_id: string;
  category_id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_at: string;
}

export interface SalesVariant {
  id: string;
  manifest_id: string;
  product_id: string;
  name: string;
  sku: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  is_active: boolean;
  supplier_id?: string;
  created_at: string;
}

export interface SalesCustomer {
  id: string;
  manifest_id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  church_branch?: string;
  created_at: string;
}

export type SalesPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type SalesFulfillmentStatus = 'PENDING' | 'RESERVED' | 'WAITING_SUPPLIER' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';

export interface SalesOrder {
  id: string;
  manifest_id: string;
  customer_id?: string;
  total_amount: number;
  amount_paid: number;
  payment_status: SalesPaymentStatus;
  fulfillment_status: SalesFulfillmentStatus;
  created_at: string;
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  unit_cost_price: number;
  created_at: string;
}

export interface SalesPayment {
  id: string;
  manifest_id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  reference?: string;
  created_at: string;
}

export interface SalesReceipt {
  id: string;
  manifest_id: string;
  order_id: string;
  receipt_number: string;
  created_at: string;
}

export interface SalesStockTakingSession {
  id: string;
  manifest_id: string;
  status: 'PENDING' | 'COMPLETED';
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface SalesStockTakingItem {
  id: string;
  session_id: string;
  variant_id: string;
  system_quantity: number;
  physical_quantity: number;
  variance: number;
  reason?: string;
  created_at: string;
}

export interface SalesInventoryMovement {
  id: string;
  manifest_id: string;
  variant_id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE';
  quantity: number;
  reason?: string;
  reference_id?: string;
  created_at: string;
}

export interface SalesSupplier {
  id: string;
  manifest_id: string;
  name: string;
  contact_info?: string;
  created_at: string;
}

export interface SalesProcurementRequest {
  id: string;
  manifest_id: string;
  order_id?: string;
  supplier_id: string;
  status: 'NOT_ORDERED' | 'ORDERED' | 'SUPPLIER_OUT_OF_STOCK' | 'WAITING_SUPPLIER' | 'IN_TRANSIT' | 'RECEIVED';
  request_date?: string;
  expected_date?: string;
  created_at: string;
}
