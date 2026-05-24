import React, { useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import { inventoryValuationService } from '../../../services/sales/inventoryValuationService';

const InventoryValuationPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const manifestId = 'default_manifest';

  useEffect(() => {
    loadValuation();
  }, []);

  const loadValuation = async () => {
    setIsLoading(true);
    try {
      const result = await inventoryValuationService.getInventoryValuation(manifestId);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading inventory valuation...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation</h1>
          <p className="text-sm text-gray-500">Valuation of current physical stock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-full bg-blue-100">
            <Box className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Cost Value</p>
            <h3 className="text-2xl font-bold text-gray-900">UGX {data?.totalCostValue.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-full bg-purple-100">
            <Box className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Retail Value</p>
            <h3 className="text-2xl font-bold text-gray-900">UGX {data?.totalRetailValue.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Variant</th>
                <th className="px-6 py-4 text-right">Stock Qty</th>
                <th className="px-6 py-4 text-right">Cost Price</th>
                <th className="px-6 py-4 text-right">Retail Price</th>
                <th className="px-6 py-4 text-right">Cost Value</th>
                <th className="px-6 py-4 text-right">Retail Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">{item.productName}</td>
                  <td className="px-6 py-4">{item.variantName} <span className="text-xs text-gray-400 block">{item.sku}</span></td>
                  <td className="px-6 py-4 text-right font-medium">{item.stockQuantity}</td>
                  <td className="px-6 py-4 text-right">UGX {item.costPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">UGX {item.sellingPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-blue-600 font-medium">UGX {item.inventoryCostValue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-purple-600 font-medium">UGX {item.inventoryRetailValue.toLocaleString()}</td>
                </tr>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No active inventory found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryValuationPage;
