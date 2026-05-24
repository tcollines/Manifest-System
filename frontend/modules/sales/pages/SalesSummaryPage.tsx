import React, { useEffect, useState } from 'react';
import { PieChart, TrendingUp, AlertTriangle, Truck, Award, ShoppingBag, Clock } from 'lucide-react';
import { salesSummaryService } from '../../../services/sales/salesSummaryService';

const SalesSummaryPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const manifestId = 'default_manifest';

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const result = await salesSummaryService.getSummary(manifestId);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading summary dashboard...</div>;
  }

  const { financials, lowStock, pendingProcurements, bestSellers } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Inventory Summary</h1>
          <p className="text-sm text-gray-500">Combined operational dashboard for management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-full bg-green-100">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Gross Profit</p>
            <h3 className="text-xl font-bold text-gray-900">UGX {financials.grossProfit.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-full bg-blue-100">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Inventory Value (Cost)</p>
            <h3 className="text-xl font-bold text-gray-900">UGX {financials.inventoryCostValue.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-full bg-yellow-100">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Outstanding Balances</p>
            <h3 className="text-xl font-bold text-gray-900">UGX {financials.outstandingBalances.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-full bg-indigo-100">
            <PieChart className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cash at Hand</p>
            <h3 className="text-xl font-bold text-gray-900">UGX {financials.cashAtHand.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 flex items-center gap-4">
          <div className="p-4 rounded-full bg-orange-100">
            <Truck className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-800">Total Procurement Value</p>
            <h3 className="text-xl font-bold text-orange-900">UGX {(data.procurementStats?.totalProcurementValue || 0).toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex items-center gap-4">
          <div className="p-4 rounded-full bg-green-100">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Paid Procurement Value</p>
            <h3 className="text-xl font-bold text-green-900">UGX {(data.procurementStats?.paidProcurementValue || 0).toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex items-center gap-4">
          <div className="p-4 rounded-full bg-red-100">
            <Clock className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-800">Outstanding Supplier Balance</p>
            <h3 className="text-xl font-bold text-red-900">UGX {(data.procurementStats?.outstandingSupplierBalance || 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden col-span-1">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-gray-900">Low Stock Alerts</h3>
          </div>
          <div className="p-0">
            {lowStock.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {lowStock.map((item: any, idx: number) => (
                  <li key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                      {item.stock_quantity} left
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-sm text-gray-500">No low stock items.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden col-span-1">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-gray-900">Best Sellers</h3>
          </div>
          <div className="p-0">
            {bestSellers.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {bestSellers.map((item: any, idx: number) => (
                  <li key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {item.count} sold
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-sm text-gray-500">No sales data available.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden col-span-1">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-gray-900">Pending Procurements</h3>
          </div>
          <div className="p-0">
            {pendingProcurements.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {pendingProcurements.map((req: any, idx: number) => (
                  <li key={idx} className="p-4 flex flex-col gap-1 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm text-gray-900">{req.sales_suppliers?.name || 'Unknown Supplier'}</p>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Expected: {req.expected_date ? new Date(req.expected_date).toLocaleDateString() : 'TBD'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-sm text-gray-500">No pending procurements.</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default SalesSummaryPage;
