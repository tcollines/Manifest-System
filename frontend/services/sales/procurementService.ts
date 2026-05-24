import { supabase } from '../supabaseClient';
import { SalesSupplier, SalesProcurementRequest, SalesProcurementRequestItem } from '../../modules/sales/types';
import { procurementPaymentService } from './procurementPaymentService';

export const procurementService = {
  async getSuppliers(manifestId: string): Promise<SalesSupplier[]> {
    const { data, error } = await supabase
      .from('sales_suppliers')
      .select('*')
      .eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
  },

  async createSupplier(manifestId: string, payload: Partial<SalesSupplier>): Promise<SalesSupplier> {
    const { data, error } = await supabase
      .from('sales_suppliers')
      .insert([{ manifest_id: manifestId, ...payload }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getProcurementRequests(manifestId: string): Promise<SalesProcurementRequest[]> {
    const { data, error } = await supabase
      .from('sales_procurement_requests')
      .select('*, sales_suppliers(name)')
      .eq('manifest_id', manifestId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  
  async getProcurementRequestItems(requestId: string): Promise<SalesProcurementRequestItem[]> {
    const { data, error } = await supabase
      .from('sales_procurement_request_items')
      .select('*, sales_product_variants(*)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createRequestWithItems(
    manifestId: string, 
    requestPayload: Partial<SalesProcurementRequest>, 
    items: Partial<SalesProcurementRequestItem>[],
    initialPayment?: { amount: number; method: string; recordedBy: string }
  ): Promise<SalesProcurementRequest> {
    // 1. Create the request
    const { data: request, error: reqError } = await supabase
      .from('sales_procurement_requests')
      .insert([{ manifest_id: manifestId, ...requestPayload, status: 'DRAFT' }])
      .select()
      .single();
    if (reqError) throw reqError;

    // 2. Create the items
    const itemsToInsert = items.map(item => ({
      ...item,
      request_id: request.id
    }));
    
    const { error: itemsError } = await supabase
      .from('sales_procurement_request_items')
      .insert(itemsToInsert);
    
    if (itemsError) {
      // Cleanup request if items failed (poor man's transaction)
      await supabase.from('sales_procurement_requests').delete().eq('id', request.id);
      throw itemsError;
    }

    // 3. Update totals (this handles the total_amount calculation from items)
    await procurementPaymentService.updateProcurementFinancialTotals(request.id);

    // 4. Record initial payment if provided
    if (initialPayment && initialPayment.amount > 0) {
      try {
        await procurementPaymentService.recordPayment(
          manifestId,
          request.id,
          requestPayload.supplier_id || '',
          initialPayment.amount,
          initialPayment.method,
          initialPayment.recordedBy,
          'Initial Payment',
          'Recorded during PO creation'
        );
      } catch (err: any) {
         console.error('Failed to record initial payment:', err);
         // Don't fail the whole creation if just the payment failed, but maybe warn
      }
    }

    return request;
  },

  async updateRequestStatus(requestId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('sales_procurement_requests')
      .update({ status })
      .eq('id', requestId);
    if (error) throw error;
  },

  async deleteRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('sales_procurement_requests')
      .delete()
      .eq('id', requestId);
    if (error) throw error;
  },

  async updateRequestWithItems(
    requestId: string,
    supplierId: string,
    items: Partial<SalesProcurementRequestItem>[]
  ): Promise<void> {
    // Update supplier
    const { error: reqError } = await supabase
      .from('sales_procurement_requests')
      .update({ supplier_id: supplierId })
      .eq('id', requestId);
    if (reqError) throw reqError;

    // Delete existing items
    const { error: delError } = await supabase
      .from('sales_procurement_request_items')
      .delete()
      .eq('request_id', requestId);
    if (delError) throw delError;

    // Insert new items
    const itemsToInsert = items.map(item => ({
      ...item,
      request_id: requestId
    }));
    
    const { error: insError } = await supabase
      .from('sales_procurement_request_items')
      .insert(itemsToInsert);
    if (insError) throw insError;

    // Recalculate totals
    await procurementPaymentService.updateProcurementFinancialTotals(requestId);
  },
  
  async receiveProcurementItem(
    manifestId: string,
    itemId: string, 
    variantId: string, 
    qtyReceivedNow: number, 
    currentQtyReceived: number,
    expectedCost: number
  ): Promise<void> {
    // 1. Update the item's quantity_received
    const { error: itemError } = await supabase
      .from('sales_procurement_request_items')
      .update({ quantity_received: currentQtyReceived + qtyReceivedNow })
      .eq('id', itemId);
    if (itemError) throw itemError;

    // 2. Get current variant stock
    const { data: variant, error: varError } = await supabase
      .from('sales_product_variants')
      .select('stock_quantity')
      .eq('id', variantId)
      .single();
    if (varError) throw varError;

    // 3. Update variant stock
    const newStock = variant.stock_quantity + qtyReceivedNow;
    const { error: updateError } = await supabase
      .from('sales_product_variants')
      .update({ stock_quantity: newStock })
      .eq('id', variantId);
    if (updateError) throw updateError;

    // 4. Create inventory movement record
    const { error: moveError } = await supabase
      .from('sales_inventory_movements')
      .insert([{
        manifest_id: manifestId,
        variant_id: variantId,
        type: 'IN',
        quantity: qtyReceivedNow,
        reason: 'Procurement Receive',
        reference_id: itemId
      }]);
    if (moveError) throw moveError;
  }
};
