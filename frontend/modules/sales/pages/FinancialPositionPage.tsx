import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Clock, TrendingUp } from 'lucide-react';
import { financialReportService } from '../../../services/sales/financialReportService';

const FinancialPositionPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const manifestId = 'default_manifest';

  useEffect(() => {
    loadPosition();
  }, []);

  const loadPosition = async () => {
    setIsLoading(true);
    try {
      const result = await financialReportService.getFinancialPosition(manifestId);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading financial position...</div>;
  }

  const kpis = [
    { title: "Cash at Hand", value: data?.cashAtHand || 0, icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
    { title: "Outstanding Customer Balances", value: data?.outstandingBalances || 0, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
    { title: "Supplier Payables", value: data?.supplierPayables || 0, icon: Clock, color: "text-red-600", bg: "bg-red-100" },
    { title: "Inventory Value (Cost)", value: data?.inventoryCostValue || 0, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Inventory Value (Retail)", value: data?.inventoryRetailValue || 0, icon: ShoppingBag, color: "text-purple-600", bg: "bg-purple-100" },
    { title: "Gross Profit (Completed Sales)", value: data?.grossProfit || 0, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Position</h1>
          <p className="text-sm text-gray-500">High-level operational summary for merchandise sales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-full ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">UGX {kpi.value.toLocaleString()}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Calculation Notes</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          <li><strong>Cash at Hand:</strong> Computed from cash payments received minus refunds paid in cash.</li>
          <li><strong>Outstanding Customer Balances:</strong> Total value of unpaid or partially paid orders that are not cancelled or refunded.</li>
          <li><strong>Supplier Payables:</strong> Outstanding balance for all active procurement requests.</li>
          <li><strong>Gross Profit:</strong> Derived strictly from <strong>COMPLETED</strong> sales where items have been fully released to the customer.</li>
        </ul>
      </div>
    </div>
  );
};

export default FinancialPositionPage;
