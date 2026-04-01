import os

filepath = r"d:\Manifest System\frontend\components\FinanceDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

target_jsx = """                {activeTab === 'requisitions' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Department Requisitions</h3>
                            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setRequisitionSubTab('Pending')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${requisitionSubTab === 'Pending' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Pending Processing
                                </button>
                                <button
                                    onClick={() => setRequisitionSubTab('Paid')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${requisitionSubTab === 'Paid' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Approved & Paid
                                </button>
                            </div>
                        </div>

                        {requisitionSubTab === 'Pending' ? (
                            <div className="grid grid-cols-1 gap-4">
                                {/* Only show 'Pending Finance' items here (approved by Admin) */}
                                {requisitions
                                    .filter(r => r.status === 'Pending Finance')
                                    .length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                        No pending requisitions to process.
                                    </div>
                                ) : (
                                    requisitions
                                        .filter(r => r.status === 'Pending Finance')
                                        .map(req => {
                                            const percentPaid = Math.min(100, Math.round(((req.amountPaid || 0) / req.totalAmount) * 100));
                                            return (
                                                <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/30 transition-shadow shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">{req.departmentId}</span>
                                                                <span className="text-xs font-mono text-gray-400">{req.requisitionNumber}</span>
                                                            </div>
                                                            <h4 className="text-lg font-bold text-gray-900">{req.title}</h4>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                                                            <p className="text-xl font-black text-gray-900">{formatMoney(req.totalAmount)}</p>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar for Partial Payments */}
                                                    <div className="mb-4">
                                                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                            <span>Paid: {formatMoney(req.amountPaid || 0)}</span>
                                                            <span>Balance: {formatMoney(req.totalAmount - (req.amountPaid || 0))}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentPaid}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                                        <button
                                                            onClick={() => showToast(`Items: \\n${req.items?.map(i => `- ${i.description} (${i.quantity} x ${i.unitCost})`).join('\\n')}`, 'info')}
                                                            className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
                                                        >
                                                            <FileText className="w-4 h-4" /> View Items
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenPaymentModal(req)}
                                                            className="bg-ministry-text text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors shadow-lg"
                                                        >
                                                            {req.amountPaid && req.amountPaid > 0 ? 'Clear Balance' : 'Process Payment'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {/* PAID Tab */}
                                {requisitions
                                    .filter(r => r.status === 'Paid')
                                    .length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                        No paid requisitions history.
                                    </div>
                                ) : (
                                    requisitions
                                        .filter(r => r.status === 'Paid')
                                        .map(req => (
                                            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 opacity-75 hover:opacity-100 transition-opacity">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-green-100 text-green-700 p-1 rounded-full"><CheckCircle className="w-4 h-4" /></span>
                                                        <h4 className="text-lg font-bold text-gray-900 line-through text-gray-400 decoration-gray-400">{req.title}</h4>
                                                    </div>
                                                    <p className="text-lg font-black text-green-600">{formatMoney(req.totalAmount)}</p>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-gray-500">
                                                    <span>{req.departmentId} • {req.requisitionNumber}</span>
                                                    <button className="text-ministry-orange font-bold hover:underline">View Accountability</button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        )}
                    </div>
                )}"""

replacement_jsx = """                {/* Phase 3: Prop-ified decoupled View */}
                {activeTab === 'requisitions' && (
                    <RequisitionsView 
                        requisitions={requisitions}
                        formatMoney={formatMoney}
                        showToast={showToast}
                        handleOpenPaymentModal={handleOpenPaymentModal}
                    />
                )}"""

append_jsx = """
const RequisitionsView = ({ 
    requisitions, 
    formatMoney,
    showToast,
    handleOpenPaymentModal
}: { 
    requisitions: Requisition[]; 
    formatMoney: (val: number) => string; 
    showToast: any;
    handleOpenPaymentModal: (req: Requisition) => void;
}) => {
    // Internal state moved down from parent
    const [requisitionSubTab, setRequisitionSubTab] = React.useState<'Pending' | 'Paid'>('Pending');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Department Requisitions</h3>
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setRequisitionSubTab('Pending')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${requisitionSubTab === 'Pending' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pending Processing
                    </button>
                    <button
                        onClick={() => setRequisitionSubTab('Paid')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${requisitionSubTab === 'Paid' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Approved & Paid
                    </button>
                </div>
            </div>

            {requisitionSubTab === 'Pending' ? (
                <div className="grid grid-cols-1 gap-4">
                    {/* Only show 'Pending Finance' items here (approved by Admin) */}
                    {requisitions
                        .filter(r => r.status === 'Pending Finance')
                        .length === 0 ? (
                        <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                            No pending requisitions to process.
                        </div>
                    ) : (
                        requisitions
                            .filter(r => r.status === 'Pending Finance')
                            .map(req => {
                                const percentPaid = Math.min(100, Math.round(((req.amountPaid || 0) / req.totalAmount) * 100));
                                return (
                                    <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/30 transition-shadow shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">{req.departmentId}</span>
                                                    <span className="text-xs font-mono text-gray-400">{req.requisitionNumber}</span>
                                                </div>
                                                <h4 className="text-lg font-bold text-gray-900">{req.title}</h4>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                                                <p className="text-xl font-black text-gray-900">{formatMoney(req.totalAmount)}</p>
                                            </div>
                                        </div>

                                        {/* Progress Bar for Partial Payments */}
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                <span>Paid: {formatMoney(req.amountPaid || 0)}</span>
                                                <span>Balance: {formatMoney(req.totalAmount - (req.amountPaid || 0))}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentPaid}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                            <button
                                                onClick={() => showToast(`Items: \\n${req.items?.map(i => `- ${i.description} (${i.quantity} x ${i.unitCost})`).join('\\n')}`, 'info')}
                                                className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
                                            >
                                                <FileText className="w-4 h-4" /> View Items
                                            </button>
                                            <button
                                                onClick={() => handleOpenPaymentModal(req)}
                                                className="bg-ministry-text text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors shadow-lg"
                                            >
                                                {req.amountPaid && req.amountPaid > 0 ? 'Clear Balance' : 'Process Payment'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {/* PAID Tab */}
                    {requisitions
                        .filter(r => r.status === 'Paid')
                        .length === 0 ? (
                        <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                            No paid requisitions history.
                        </div>
                    ) : (
                        requisitions
                            .filter(r => r.status === 'Paid')
                            .map(req => (
                                <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 opacity-75 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-green-100 text-green-700 p-1 rounded-full"><CheckCircle className="w-4 h-4" /></span>
                                            <h4 className="text-lg font-bold text-gray-900 line-through text-gray-400 decoration-gray-400">{req.title}</h4>
                                        </div>
                                        <p className="text-lg font-black text-green-600">{formatMoney(req.totalAmount)}</p>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-500">
                                        <span>{req.departmentId} • {req.requisitionNumber}</span>
                                        <button className="text-ministry-orange font-bold hover:underline">View Accountability</button>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            )}
        </div>
    );
};
"""

if target_jsx in code:
    code = code.replace(target_jsx, replacement_jsx)
    code = code.replace("export default FinanceDashboard;", append_jsx + "\nexport default FinanceDashboard;")
    
    # We also need to remove 'const [requisitionSubTab, setRequisitionSubTab] = useState...' from the parent since we moved it down.
    code = code.replace("    const [requisitionSubTab, setRequisitionSubTab] = useState<'Pending' | 'Paid'>('Pending');\n", "")
    
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(code)
    print("Successfully extracted RequisitionsView!")
else:
    print("Could not find target JSX. Check spaces or formatting.")
