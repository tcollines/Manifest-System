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
  reserved_quantity: number;
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
  procurement_request_id?: string;
  fulfillment_source?: string;
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
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'RESERVATION' | 'RESERVATION_RELEASE' | 'REFUND' | 'RETURN' | 'PROCUREMENT_RECEIPT';
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
 status: 'DRAFT' | 'ORDERED' | 'SUPPLIER_OUT_OF_STOCK' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
 payment_status: 'UNPAID' | 'PARTIAL' | 'PAID';
 total_amount: number;
 amount_paid: number;
 balance_due: number;
 request_date?: string;
 expected_date?: string;
 created_at: string;
}

export interface SalesProcurementPayment {
  id: string;
  manifest_id: string;
  procurement_request_id: string;
  supplier_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_reference?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface SalesProcurementRequestItem {
 id: string;
 request_id: string;
 variant_id: string;
 quantity_ordered: number;
 quantity_received: number;
 expected_cost: number;
 created_at: string;
 sales_product_variants?: SalesVariant;
}

export interface SalesCustomerHistory {
  total_orders: number;
  total_purchases: number;
  outstanding_balance: number;
  recent_orders: Partial<SalesOrder>[];
  recent_payments: Partial<SalesPayment>[];
}
