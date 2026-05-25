import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { DollarSign, Calculator, Wallet, PieChart, FileText } from 'lucide-react';

const TABS = [
    { id: 'sales-summary', label: 'Sales & Inventory Summary', mobileLabel: 'Summary', icon: PieChart },
    { id: 'financial-position', label: 'Financial Position', mobileLabel: 'Position', icon: DollarSign },
    { id: 'inventory-valuation', label: 'Inventory Valuation', mobileLabel: 'Valuation', icon: Calculator },
    { id: 'cash-position', label: 'Cash Position', mobileLabel: 'Cash', icon: Wallet },
];

export const SalesFinancialsTabsLayout: React.FC = () => {
    const location = useLocation();

    // Since this is rendered under /departments/:deptId/financials
    // the base path is the current pathname up to /financials
    const pathParts = location.pathname.split('/');
    // Find the index of financials
    const financialsIndex = pathParts.indexOf('financials');
    const basePath = financialsIndex !== -1 ? pathParts.slice(0, financialsIndex + 1).join('/') : location.pathname;

    return (
        <div className="flex flex-col min-h-full bg-gray-50">
            {/* Header */}
            <div className="px-4 md:px-8 pt-4 md:pt-8 pb-0">
                <div className="flex items-start gap-3 mb-4">
                    <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-gray-900 leading-tight">Reports & Financials</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Comprehensive financial and operational reports.</p>
                    </div>
                </div>

                {/* Desktop pill tab strip */}
                <div className="hidden md:flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit mb-6 overflow-x-auto">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <NavLink
                            key={id}
                            to={`${basePath}/${id}`}
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} />
                                    <span>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 mb-20 md:mb-0 px-4 md:px-8 pb-8">
                <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
            </div>

            {/* Mobile Floating Bottom Navigation */}
            <div className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-sm">
                <div className="flex items-center justify-around bg-white/90 backdrop-blur-xl p-2 rounded-2xl border border-gray-100 shadow-lg">
                    {TABS.map(({ id, mobileLabel, icon: Icon }) => (
                        <NavLink
                            key={id}
                            to={`${basePath}/${id}`}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-300 relative overflow-hidden ${isActive ? 'text-blue-600' : 'text-gray-500'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className="absolute inset-0 bg-blue-50 rounded-xl" />}
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        <Icon strokeWidth={isActive ? 2.5 : 2} className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-blue-600 scale-110' : ''}`} />
                                        <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold text-blue-600' : 'font-medium'}`}>{mobileLabel}</span>
                                    </div>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
};
