import React, { useEffect, useState } from 'react';
import { Wallet, Smartphone, Building, RefreshCcw, HandCoins } from 'lucide-react';
import { cashPositionService } from '../../../services/sales/cashPositionService';

const CashPositionPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const manifestId = 'default_manifest';

  useEffect(() => {
    loadPosition();
  }, []);

  const loadPosition = async () => {
    setIsLoading(true);
    try {
      const result = await cashPositionService.getCashPosition(manifestId);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading cash position...</div>;
  }

  const kpis = [
    { title: "Cash Payments Received", value: data?.cashPaymentsReceived || 0, icon: HandCoins, color: "text-green-600", bg: "bg-green-100" },
    { title: "Mobile Money Received", value: data?.mobileMoneyPaymentsReceived || 0, icon: Smartphone, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Bank Payments Received", value: data?.bankPaymentsReceived || 0, icon: Building, color: "text-indigo-600", bg: "bg-indigo-100" },
    { title: "Refunds Issued", value: data?.refundsIssued || 0, icon: RefreshCcw, color: "text-red-600", bg: "bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Position</h1>
          <p className="text-sm text-gray-500">Breakdown of received payments and available cash</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Deductions (Supplier Payments)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-600 font-medium text-sm">Paid via Cash</span>
            <span className="font-bold text-gray-900">UGX {(data?.supplierCashPayments || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-600 font-medium text-sm">Paid via Mobile Money</span>
            <span className="font-bold text-gray-900">UGX {(data?.supplierMobileMoneyPayments || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-600 font-medium text-sm">Paid via Bank</span>
            <span className="font-bold text-gray-900">UGX {(data?.supplierBankPayments || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-ministry-dark p-8 rounded-xl shadow-lg border border-gray-800 text-white flex flex-col justify-center items-center text-center">
          <Wallet className="w-12 h-12 text-ministry-neon mb-4" />
          <p className="text-gray-400 font-medium mb-1">Current Cash at Hand</p>
          <h2 className="text-3xl font-bold text-ministry-neon">UGX {data?.cashAtHand.toLocaleString()}</h2>
          <p className="text-xs text-gray-500 mt-4">Cash Received - Cash Refunds - Supplier Cash Payments</p>
        </div>
        
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
          <Smartphone className="w-12 h-12 text-blue-500 mb-4" />
          <p className="text-gray-500 font-medium mb-1">Net Mobile Money</p>
          <h2 className="text-3xl font-bold text-gray-900">UGX {data?.netMobileMoney?.toLocaleString() || 0}</h2>
          <p className="text-xs text-gray-500 mt-4">MM Received - Supplier MM Payments</p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
          <Building className="w-12 h-12 text-indigo-500 mb-4" />
          <p className="text-gray-500 font-medium mb-1">Net Bank Balance</p>
          <h2 className="text-3xl font-bold text-gray-900">UGX {data?.netBank?.toLocaleString() || 0}</h2>
          <p className="text-xs text-gray-500 mt-4">Bank Received - Supplier Bank Payments</p>
        </div>
      </div>

      <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex items-center justify-between">
        <div>
           <p className="text-green-800 font-medium">Total Net Position</p>
           <p className="text-sm text-green-600">Combined value of Cash, Mobile Money, and Bank accounts.</p>
        </div>
        <h2 className="text-3xl font-bold text-green-700">UGX {data?.netReceivedCash.toLocaleString()}</h2>
      </div>
    </div>
  );
};

export default CashPositionPage;
