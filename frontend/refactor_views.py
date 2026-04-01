import os

filepath = r"d:\Manifest System\frontend\components\FinanceDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

target_jsx = """                {(activeTab === 'income' || activeTab === 'expenses') && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-800">{activeTab === 'income' ? 'Income Transactions' : 'Expenditure Log'}</h3>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions
                                        .filter(t => activeTab === 'income' ? t.type === 'Income' : t.type === 'Expense')
                                        .map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-mono text-gray-600">{t.date}</td>
                                                <td className="px-6 py-4 font-bold text-gray-800">{t.category}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{t.description}</td>
                                                <td className={`px-6 py-4 text-right font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatMoney(t.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    {transactions.filter(t => activeTab === 'income' ? t.type === 'Income' : t.type === 'Expense').length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}"""

replacement_jsx = """                {/* Phase 3: Prop-ified decoupled View */}
                {(activeTab === 'income' || activeTab === 'expenses') && (
                    <TransactionsView 
                        activeTab={activeTab}
                        transactions={transactions}
                        formatMoney={formatMoney}
                    />
                )}"""

append_jsx = """
// --- PRE-DECOMPOSITION EXTRACTED VIEWS ---

const TransactionsView = ({ 
    activeTab, 
    transactions, 
    formatMoney 
}: { 
    activeTab: 'income' | 'expenses' | 'requisitions' | 'fleet'; 
    transactions: any[]; 
    formatMoney: (val: number) => string; 
}) => {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800">{activeTab === 'income' ? 'Income Transactions' : 'Expenditure Log'}</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions
                            .filter(t => activeTab === 'income' ? t.type === 'Income' : t.type === 'Expense')
                            .map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{t.date}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{t.category}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{t.description}</td>
                                    <td className={`px-6 py-4 text-right font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatMoney(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        {transactions.filter(t => activeTab === 'income' ? t.type === 'Income' : t.type === 'Expense').length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">No records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
"""

if target_jsx in code:
    code = code.replace(target_jsx, replacement_jsx)
    code = code.replace("export default FinanceDashboard;", append_jsx + "\nexport default FinanceDashboard;")
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(code)
    print("Successfully extracted TransactionsView!")
else:
    print("Could not find target JSX. Check spaces or formatting.")
