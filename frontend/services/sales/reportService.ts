import { supabase } from '../supabaseClient';

export const reportService = {
  async getDailySales(manifestId: string, date: string): Promise<any> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        id,
        total_amount,
        amount_paid,
        fulfillment_status,
        sales_order_items (
          quantity,
          unit_price,
          unit_cost_price
        )
      `)
      .eq('manifest_id', manifestId)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`);
      
    if (error) throw error;

    let totalSales = 0;
    let totalProfit = 0;
    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;

    data?.forEach((order: any) => {
      // User specific rule: "Profit should only count completed/fulfilled sales"
      if (order.fulfillment_status === 'COMPLETED') {
        completedOrdersCount++;
        totalSales += Number(order.total_amount);
        
        // Calculate profit
        order.sales_order_items?.forEach((item: any) => {
          const itemProfit = (Number(item.unit_price) - Number(item.unit_cost_price)) * Number(item.quantity);
          totalProfit += itemProfit;
        });
      } else {
        pendingOrdersCount++;
      }
    });

    return {
      totalSales,
      totalProfit,
      completedOrdersCount,
      pendingOrdersCount,
      orders: data
    };
  },

  async getAllTimeStats(manifestId: string): Promise<any> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        id,
        total_amount,
        amount_paid,
        fulfillment_status,
        sales_order_items (
          quantity,
          unit_price,
          unit_cost_price
        )
      `)
      .eq('manifest_id', manifestId);
      
    if (error) throw error;

    let totalSales = 0;
    let totalProfit = 0;
    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;

    data?.forEach((order: any) => {
      if (order.fulfillment_status === 'COMPLETED') {
        completedOrdersCount++;
        totalSales += Number(order.total_amount);
        
        order.sales_order_items?.forEach((item: any) => {
          const itemProfit = (Number(item.unit_price) - Number(item.unit_cost_price)) * Number(item.quantity);
          totalProfit += itemProfit;
        });
      } else {
        pendingOrdersCount++;
      }
    });

    return {
      totalSales,
      totalProfit,
      completedOrdersCount,
      pendingOrdersCount,
      orders: data
    };
  }
};
