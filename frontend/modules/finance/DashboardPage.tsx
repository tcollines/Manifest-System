/** DashboardPage — route: /finance/overview */
import React from 'react';
import { TrendingUp, CreditCard, DollarSign, FileText } from 'lucide-react';
import { useFinance } from './FinanceContext';
import { useFinanceAnalytics } from '../../services/analyticsService';
import { KpiCard } from '../../components/ui/KpiCard';

const DashboardPage: React.FC = () => {
    const { formatMoney, events, selectedEventId, setSelectedEventId } = useFinance();
    const { data: financeStats, isLoading: isFinanceStatsLoading } = useFinanceAnalytics();

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Event Selector — mobile only (desktop has it in the top bar) */}
            <div className="md:hidden">
                {events.length > 0 && (
                    <select
                        value={selectedEventId}
                        onChange={e => setSelectedEventId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-100 border-none rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-ministry-orange"
                    >
                        <option value="">-- View All (Global) --</option>
                        {events.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                                {ev.date} • {ev.title}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div>
                <h3 className="text-lg font-bold text-gray-800">Financial Overview</h3>
                <p className="text-sm text-gray-500">Summary of all financial activity</p>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Total Income"
                    value={formatMoney(financeStats?.total_income ?? 0)}
                    icon={TrendingUp}
                    isLoading={isFinanceStatsLoading}
                />
                <KpiCard
                    label="Total Expenses"
                    value={formatMoney(financeStats?.total_expenses ?? 0)}
                    icon={CreditCard}
                    isLoading={isFinanceStatsLoading}
                />
                <KpiCard
                    label="Net Balance"
                    value={formatMoney((financeStats?.total_income ?? 0) - (financeStats?.total_expenses ?? 0))}
                    icon={DollarSign}
                    isLoading={isFinanceStatsLoading}
                />
                <KpiCard
                    label="Requisitions Pending"
                    value={financeStats?.requisitions_pending ?? 0}
                    icon={FileText}
                    isLoading={isFinanceStatsLoading}
                />
            </div>
        </div>
    );
};

export default DashboardPage;
