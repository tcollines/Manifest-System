import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Clock, TrendingUp } from 'lucide-react';
import { reportService } from '../../../services/sales/reportService';
import { useAuth } from '../../../context/AuthContext';

const SalesDashboardPage: React.FC = () => {
 const { user } = useAuth();
 const [data, setData] = useState({ totalSales: 0, totalProfit: 0, completedOrdersCount: 0, pendingOrdersCount: 0 });
 const manifestId = 'default_manifest';

 useEffect(() => {
 loadDashboard();
 }, []);

 const loadDashboard = async () => {
 const today = new Date().toISOString().split('T')[0];
 try {
 const stats = await reportService.getDailySales(manifestId, today);
 setData(stats);
 } catch (e) {
 console.error(e);
 }
 };

 const kpis = [
 { title:"Today's Sales", value: `UGX ${data.totalSales.toLocaleString()}`, icon: DollarSign, color:"text-green-500", bg:"bg-green-100"},
 { title:"Today's Profit", value: `UGX ${data.totalProfit.toLocaleString()}`, icon: TrendingUp, color:"text-blue-500", bg:"bg-blue-100"},
 { title:"Fulfilled Orders", value: data.completedOrdersCount.toString(), icon: ShoppingBag, color:"text-ministry-orange", bg:"bg-orange-100"},
 { title:"Pending Pickups", value: data.pendingOrdersCount.toString(), icon: Clock, color:"text-yellow-500", bg:"bg-yellow-100"},
 ];

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Daily Sales Dashboard</h1>
 <div className="text-sm text-gray-500">{new Date().toDateString()}</div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {kpis.map((kpi, index) => (
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
