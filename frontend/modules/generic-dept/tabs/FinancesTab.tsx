import React, { useEffect, useState, useCallback } from 'react';
import { Department, DeptFinanceEntry, User } from '../../../types';
import { DeptRole, FinanceEntryType } from '../../../shared/enums';
import { DeptFinanceStore, DeptFinanceSummary } from '../../../database/deptFinanceStore';
import { validate, AddFinanceEntrySchema } from '../../../shared/validators/deptSchemas';
import { canEditInTab } from '../../../domain/deptAccessRules';
import { useNotification } from '../../../components/ui/NotificationSystem';
import StatCard from '../../../components/ui/StatCard';
import DataTable, { TableColumn } from '../../../components/ui/DataTable';
import Badge, { statusVariant } from '../../../components/ui/Badge';
import SelectInput from '../../../components/ui/SelectInput';
import NumberInput from '../../../components/ui/NumberInput';
import TextInput from '../../../components/ui/TextInput';
import DateInput from '../../../components/ui/DateInput';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../../../shared/formatters';
import { TrendingUp, TrendingDown, Scale, Plus, Trash2, Edit2 } from 'lucide-react';

interface Props { department: Department; user: User | null; deptRole: DeptRole | null; systemRole: any; }

const FinancesTab: React.FC<Props> = ({ department, user, deptRole, systemRole }) => {
    const { showToast, confirm } = useNotification();
    const canEdit = canEditInTab(deptRole, systemRole, 'finances');

    const [entries, setEntries]           = useState<DeptFinanceEntry[]>([]);
    const [summary, setSummary]           = useState<DeptFinanceSummary>({ totalIncome: 0, totalExpense: 0, netBalance: 0 });
    const [loading, setLoading]           = useState(true);
    const [activeType, setActiveType]     = useState<'all' | 'Income' | 'Expense'>('all');
    const [showForm, setShowForm]         = useState(false);
    const [editingId, setEditingId]       = useState<string | null>(null);
    const [form, setForm]                 = useState({ type: 'Income', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
    const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({});
    const [saving, setSaving]             = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await DeptFinanceStore.getByDepartment(department.id);
        if (res.status === 'success') {
            setEntries(res.data);
            setSummary(DeptFinanceStore.getSummary(res.data));
        }
        setLoading(false);
    }, [department.id]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        const raw = validate(AddFinanceEntrySchema, { ...form, departmentId: department.id });
        if (!raw.success) { setFieldErrors((raw as { success: false; errors: Record<string, string> }).errors); return; }
        const validData = (raw as { success: true; data: any }).data;
        setSaving(true);
        const res = editingId 
            ? await DeptFinanceStore.update({ ...validData, entryId: editingId })
            : await DeptFinanceStore.add(validData);
        setSaving(false);
        if (res.status === 'success') {
            showToast(editingId ? 'Entry updated!' : 'Entry recorded!', 'success');
            setShowForm(false);
            setEditingId(null);
            setForm({ type: 'Income', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
            setFieldErrors({});
            load();
        } else showToast(res.message, 'error');
    };

    const handleEdit = (e: DeptFinanceEntry) => {
        setForm({
            type: e.type as 'Income' | 'Expense',
            amount: e.amount,
            description: e.description || '',
            date: e.date,
        });
        setEditingId(e.id);
        setShowForm(true);
        setFieldErrors({});
    };

    const handleDelete = (e: DeptFinanceEntry) => confirm('Delete this finance entry?', async () => {
        const res = await DeptFinanceStore.delete(department.id, e.id);
        if (res.status === 'success') { showToast('Deleted', 'success'); load(); }
        else showToast(res.message, 'error');
    });

    const filtered = activeType === 'all' ? entries : entries.filter(e => e.type === activeType);

    const columns: TableColumn<DeptFinanceEntry>[] = [
        { key: 'date',        header: 'Date',      render: e => formatDate(e.date), sortable: true },
        { key: 'type',        header: 'Type',       render: e => <Badge label={e.type} variant={e.type === 'Income' ? 'success' : 'error'} dot /> },
        { key: 'description', header: 'Description' },
        { key: 'amount',      header: 'Amount',     align: 'right', render: e => <span className={e.type === 'Income' ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{formatCurrency(e.amount)}</span>, sortable: true },
        ...(canEdit ? [{ key: '_actions' as any, header: '', align: 'right' as const, render: (e: DeptFinanceEntry) => (
            <div className="flex justify-end gap-2">
                <button onClick={() => handleEdit(e)} className="text-gray-400 hover:text-blue-600 p-1 rounded"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(e)} className="text-red-400 hover:text-red-600 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
        )}] : []),
    ];

    if (loading) return <LoadingSpinner fullPage message="Loading finances…" />;

    return (
        <div className="flex flex-col gap-5">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard title="Total Income"  value={formatCurrency(summary.totalIncome)}  icon={TrendingUp}   iconBg="bg-green-50"  iconColor="text-green-600" />
                <StatCard title="Total Expense" value={formatCurrency(summary.totalExpense)} icon={TrendingDown} iconBg="bg-red-50"    iconColor="text-red-500" />
                <StatCard title="Net Balance"   value={formatCurrency(summary.netBalance)}   icon={Scale}        iconBg={summary.netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'} iconColor={summary.netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex gap-1">
                    {(['all', 'Income', 'Expense'] as const).map(t => (
                        <button key={t} onClick={() => setActiveType(t)} className={['px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors', activeType === t ? 'bg-ministry-orange/10 text-ministry-orange' : 'text-gray-500 hover:bg-gray-100'].join(' ')}>{t === 'all' ? 'All' : t}</button>
                    ))}
                </div>
                {canEdit && (
                    <button onClick={() => setShowForm(f => !f)} className="inline-flex items-center gap-1.5 bg-ministry-text text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-ministry-orange transition-colors">
                        <Plus className="w-4 h-4" /> Add Entry
                    </button>
                )}
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl w-full max-w-lg">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{editingId ? 'Edit Entry' : 'Add Entry'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectInput label="Type" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} options={[{value:'Income',label:'Income'},{value:'Expense',label:'Expense'}]} error={fieldErrors.type} required />
                            <NumberInput label="Amount (UGX)" format="currency" value={form.amount} onChange={v => setForm(f => ({...f, amount: v}))} error={fieldErrors.amount} required />
                            <DateInput label="Date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} error={fieldErrors.date} required />
                            <div className="md:col-span-2">
                                <TextInput label="Description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} error={fieldErrors.description} required />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                                <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ type: 'Income', amount: 0, description: '', date: new Date().toISOString().split('T')[0] }); }} className="text-gray-500 px-4 py-2 text-sm hover:bg-gray-100 rounded-xl">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="bg-ministry-text text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-ministry-orange disabled:opacity-50">{saving ? 'Saving…' : (editingId ? 'Update' : 'Save')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DataTable columns={columns} data={filtered} keyExtractor={e => e.id} emptyVariant="finance" />
        </div>
    );
};

export default FinancesTab;
