import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import {
    Plus, Search, FileSpreadsheet, Trash2,
    LayoutGrid, List, Filter, Download,
    Package, MapPin, Calendar, DollarSign,
    User as UserIcon, CheckCircle, AlertTriangle, X
} from 'lucide-react';
import { Asset, AssetStore } from '../database/assetStore';
import { User, Department } from '../types';
import { DepartmentStore } from '../database/departmentStore';
import { departmentMap } from '../constants/departmentMap';

interface AssetsTabProps {
    departmentId?: string; // If provided, filters by this department. If null/undefined, shows all (Admin view)
    currentUser: User;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({ departmentId, currentUser }) => {
    const { showToast, confirm: askConfirm } = useNotification();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // Filter States
    const [selectedDept, setSelectedDept] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Form State
    const initialFormState = {
        asset_number: '',
        name: '',
        description: '',
        serial_number: '',
        date_procured: new Date().toISOString().split('T')[0],
        value_at_purchase: 0,
        // Auto-select department:
        // 1. If departmentId is passed (e.g. from Dashboard), use it.
        // 2. If Admin, default to administration department UUID.
        // 3. If User has a department (Team Leader), use that.
        department_id: departmentId || (currentUser.role === 'Administrator' ? departmentMap.administration.uuid : currentUser.departmentId || ''),
        current_condition: 'Working',
        storage_location: '',
        responsible_person: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    // Fetch Assets
    const fetchAssets = async () => {
        setLoading(true);
        try {
            let data;
            if (departmentId) {
                data = await AssetStore.getByDepartment(departmentId);
            } else {
                data = await AssetStore.getAll();
            }
            setAssets(data);

            const deptRes = await DepartmentStore.getAll();
            if (deptRes.status === 'success') {
                setDepartments(deptRes.data.filter(d => d.status.toLowerCase() === 'active'));
            }
        } catch (error) {
            console.error("Error fetching assets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();

        // Subscribe to realtime changes
        const subscription = AssetStore.subscribe(() => {
            fetchAssets();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [departmentId]);

    // Handle Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await AssetStore.add({
                ...formData,
                asset_number: formData.asset_number || `AST-${Date.now().toString().slice(-6)}` // Auto-gen if empty
            });
            setIsAddAssetOpen(false);
            setFormData(initialFormState);
            showToast('Asset added successfully', 'success');
        } catch (error: any) {
            showToast('Error adding asset: ' + error.message, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (await askConfirm("Delete Asset?", 'Are you sure you want to delete this asset?')) {
            try {
                await AssetStore.delete(id);
                showToast("Asset deleted.", 'success');
            } catch (error: any) {
                showToast('Error deleting asset: ' + error.message, 'error');
            }
        }
    };

    // Filter Assets
    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.asset_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase());

        // View Restriction Logic:
        // 1. If departmentId prop is passed (e.g. Dashboard widget), use it.
        // 2. If User is Admin, allow filtering by selectedDept (or show all).
        // 3. If User is Non-Admin, FORCE filter by their departmentId.

        let matchesDept = true;

        const isGlobalViewer = currentUser.role === 'Administrator' || currentUser.role === 'Super Admin' || currentUser.role === 'TeamLeader';

        if (departmentId) {
            matchesDept = asset.department_id === departmentId;
        } else if (isGlobalViewer) {
            matchesDept = selectedDept ? asset.department_id === selectedDept : true;
        } else {
            // Non-Admin on global view -> restricted to own department
            matchesDept = asset.department_id === currentUser.departmentId;
        }

        const matchesDate = dateFilter ? asset.date_procured === dateFilter : true;

        return matchesSearch && matchesDept && matchesDate;
    });

    const totalValue = filteredAssets.reduce((sum, asset) => sum + (Number(asset.value_at_purchase) || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Package className="w-5 h-5 md:w-8 md:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">Total Assets</p>
                        <p className="text-xl md:text-2xl font-black text-gray-900">{filteredAssets.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-green-50 text-green-600 rounded-xl">
                        <DollarSign className="w-5 h-5 md:w-8 md:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">Total Value</p>
                        <p className="text-xl md:text-2xl font-black text-gray-900 truncate max-w-[100px] md:max-w-none">
                            UGX {totalValue.toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 col-span-2 md:col-span-1">
                    <div className="p-2 md:p-3 bg-orange-50 text-ministry-orange rounded-xl">
                        <AlertTriangle className="w-5 h-5 md:w-8 md:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">Needs Repair</p>
                        <p className="text-xl md:text-2xl font-black text-gray-900">
                            {filteredAssets.filter(a => a.current_condition === 'Needs Repair').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ministry-orange"
                        />
                    </div>

                    {/* Department Filter (Only for Global Viewers) */}
                    {!departmentId && (currentUser.role === 'Administrator' || currentUser.role === 'Super Admin' || currentUser.role === 'TeamLeader') && (
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="w-full md:w-48 py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ministry-orange"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Date Filter */}
                    <div className="relative w-full md:w-48">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ministry-orange"
                        />
                    </div>
                </div>


                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setIsAddAssetOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-xl hover:bg-ministry-orange transition-colors font-bold shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Asset</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-bold">
                        <Download className="w-4 h-4" />
                        <span className="hidden md:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Asset Details</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Department</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Location / User</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Purchase Info</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Condition</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <Package className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{asset.name}</p>
                                                <p className="text-xs text-gray-500 font-mono">{asset.asset_number}</p>
                                                {asset.serial_number && <p className="text-[10px] text-gray-400">SN: {asset.serial_number}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-bold text-gray-700 px-2 py-1 bg-gray-100 rounded-lg">
                                            {departments.find(d => d.id === asset.department_id)?.name || asset.department_id}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-700 flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-gray-400" /> {asset.storage_location}
                                            </p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <UserIcon className="w-3 h-3 text-gray-400" /> {asset.responsible_person}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-gray-900">UGX {Number(asset.value_at_purchase).toLocaleString()}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-gray-400" /> {asset.date_procured}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold
                      ${asset.current_condition === 'Working' ? 'bg-green-100 text-green-700' :
                                                asset.current_condition === 'Needs Repair' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'}`}>
                                            {asset.current_condition}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(asset.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredAssets.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-400">
                                        No assets found. Add one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Asset Modal */}
            {isAddAssetOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Register New Asset</h3>
                            <button onClick={() => setIsAddAssetOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Asset Name</label>
                                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="e.g. Dell Latitude 5420" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Asset Number</label>
                                    <input value={formData.asset_number} onChange={e => setFormData({ ...formData, asset_number: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Auto-generated if empty" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Serial Number</label>
                                    <input value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Manufacturer S/N" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Value (UGX)</label>
                                    <input type="number" value={formData.value_at_purchase} onChange={e => setFormData({ ...formData, value_at_purchase: Number(e.target.value) })} className="w-full p-3 border rounded-xl" placeholder="0" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Department</label>
                                    <select
                                        value={formData.department_id}
                                        onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                        disabled={!(currentUser.role === 'Administrator' || currentUser.role === 'Super Admin' || currentUser.role === 'TeamLeader')}
                                        className={`w-full p-3 border rounded-xl bg-white ${!(currentUser.role === 'Administrator' || currentUser.role === 'Super Admin' || currentUser.role === 'TeamLeader') ? 'opacity-70 bg-gray-100' : ''}`}
                                    >
                                        <option value="">Select Department...</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Date Procured</label>
                                    <input type="date" value={formData.date_procured} onChange={e => setFormData({ ...formData, date_procured: e.target.value })} className="w-full p-3 border rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Condition</label>
                                    <select value={formData.current_condition} onChange={e => setFormData({ ...formData, current_condition: e.target.value })} className="w-full p-3 border rounded-xl bg-white">
                                        <option>Working</option>
                                        <option>Needs Repair</option>
                                        <option>Written Off</option>
                                        <option>Lost/Stolen</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Storage Location</label>
                                    <input required value={formData.storage_location} onChange={e => setFormData({ ...formData, storage_location: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="e.g. Server Room A" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Responsible Person</label>
                                    <input required value={formData.responsible_person} onChange={e => setFormData({ ...formData, responsible_person: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="e.g. John Doe" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-3 border rounded-xl h-24" placeholder="Additional details..." />
                            </div>

                            <div className="flex justify-end pt-4 gap-3 border-t border-gray-100">
                                <button type="button" onClick={() => setIsAddAssetOpen(false)} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange transition-colors">
                                    Save Asset
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}
        </div >
    );
};
