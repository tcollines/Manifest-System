import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Clock, TrendingUp } from 'lucide-react';
import { reportService } from '../../../services/sales/reportService';
import { financialReportService } from '../../../services/sales/financialReportService';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SalesDashboardPage: React.FC = () => {
 const { user } = useAuth();
 const [data, setData] = useState({ totalSales: 0, totalProfit: 0, completedOrdersCount: 0, pendingOrdersCount: 0 });
 const [allTimeData, setAllTimeData] = useState({ totalSales: 0, totalProfit: 0, completedOrdersCount: 0, pendingOrdersCount: 0 });
 const [financialData, setFinancialData] = useState({ cashAtHand: 0, inventoryCostValue: 0, inventoryRetailValue: 0, outstandingBalances: 0, supplierPayables: 0, grossProfit: 0 });
 const manifestId = 'default_manifest';
 const navigate = useNavigate();

 useEffect(() => {
 loadDashboard();
 }, []);

 const loadDashboard = async () => {
 const today = new Date().toISOString().split('T')[0];
 try {
 const [stats, allTimeStats, financials] = await Promise.all([
 reportService.getDailySales(manifestId, today),
 reportService.getAllTimeStats(manifestId),
 financialReportService.getFinancialPosition(manifestId)
 ]);
 setData(stats);
 setAllTimeData(allTimeStats);
 setFinancialData(financials);
 } catch (e) {
 console.error(e);
 }
 };

 const todayKpis = [
 { title:"Today's Sales", value: `UGX ${data.totalSales.toLocaleString()}`, icon: DollarSign, color:"text-green-500", bg:"bg-green-100", path: '../orders?date=today'},
 { title:"Today's Profit", value: `UGX ${data.totalProfit.toLocaleString()}`, icon: TrendingUp, color:"text-blue-500", bg:"bg-blue-100"},
 { title:"Today's Fulfilled", value: data.completedOrdersCount.toString(), icon: ShoppingBag, color:"text-ministry-orange", bg:"bg-orange-100", path: '../orders?date=today&status=COMPLETED'},
 { title:"Today's Pending", value: data.pendingOrdersCount.toString(), icon: Clock, color:"text-yellow-500", bg:"bg-yellow-100", path: '../orders?date=today&status=PENDING'},
 ];

 const allTimeKpis = [
 { title:"All-Time Sales", value: `UGX ${allTimeData.totalSales.toLocaleString()}`, icon: DollarSign, color:"text-green-600", bg:"bg-green-50", path: '../orders'},
 { title:"All-Time Profit", value: `UGX ${allTimeData.totalProfit.toLocaleString()}`, icon: TrendingUp, color:"text-blue-600", bg:"bg-blue-50"},
 { title:"Total Fulfilled", value: allTimeData.completedOrdersCount.toString(), icon: ShoppingBag, color:"text-orange-600", bg:"bg-orange-50", path: '../orders?status=COMPLETED'},
 { title:"Total Pending", value: allTimeData.pendingOrdersCount.toString(), icon: Clock, color:"text-yellow-600", bg:"bg-yellow-50", path: '../orders?status=PENDING'},
 ];

 const financialKpis = [
 { title:"Cash at Hand", value: `UGX ${financialData.cashAtHand.toLocaleString()}`, icon: DollarSign, color:"text-green-600", bg:"bg-green-100"},
 { title:"Inventory Cost Value", value: `UGX ${financialData.inventoryCostValue.toLocaleString()}`, icon: ShoppingBag, color:"text-blue-600", bg:"bg-blue-100"},
 { title:"Inventory Retail Value", value: `UGX ${financialData.inventoryRetailValue.toLocaleString()}`, icon: ShoppingBag, color:"text-purple-600", bg:"bg-purple-100"},
 { title:"Gross Profit", value: `UGX ${financialData.grossProfit.toLocaleString()}`, icon: TrendingUp, color:"text-indigo-600", bg:"bg-indigo-100"},
 { title:"Outstanding Balances", value: `UGX ${financialData.outstandingBalances.toLocaleString()}`, icon: Clock, color:"text-yellow-600", bg:"bg-yellow-100"},
 { title:"Supplier Payables", value: `UGX ${financialData.supplierPayables.toLocaleString()}`, icon: Clock, color:"text-red-600", bg:"bg-red-100"},
 ];

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
 <div className="text-sm text-gray-500">{new Date().toDateString()}</div>
 </div>

 <div>
 <h2 className="text-lg font-bold text-gray-800 mb-4">Today's Overview</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {todayKpis.map((kpi, index) => (
 <div 
   key={index} 
   onClick={() => kpi.path && navigate(kpi.path)}
   className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 ${kpi.path ? 'cursor-pointer hover:border-ministry-orange transition-colors' : ''}`}
 >
 <div className={`p-4 rounded-full ${kpi.bg}`}>
 <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
 </div>
 <div>
 <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
 <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div>
 <h2 className="text-lg font-bold text-gray-800 mb-4">All-Time Performance</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {allTimeKpis.map((kpi, index) => (
 <div 
   key={index} 
   onClick={() => kpi.path && navigate(kpi.path)}
   className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 ${kpi.path ? 'cursor-pointer hover:border-ministry-orange transition-colors' : ''}`}
 >
 <div className={`p-4 rounded-full ${kpi.bg}`}>
 <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
 </div>
 <div>
 <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
 <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div>
 <h2 className="text-lg font-bold text-gray-800 mb-4">Financial Overview</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {financialKpis.map((kpi, index) => (
 <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
 <div className={`p-4 rounded-full ${kpi.bg}`}>
 <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
 </div>
 <div>
 <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
 <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
 <h2 className="text-lg font-bold text-gray-900 mb-4">Profit Calculation Note</h2>
 <p className="text-gray-600">
 Profit is calculated using the formula: <code className="bg-gray-100 px-2 py-1 rounded">(Selling Price - Cost Price) × Quantity</code>. 
 It only includes <strong>COMPLETED</strong> sales where the item has been fully paid for and released to the customer. Pending or partially paid items are excluded.
 </p>
 </div>
 </div>
 );
};

export default SalesDashboardPage;
