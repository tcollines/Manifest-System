import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Activity, ArrowLeft, Save, Heart, Trash2, FileText, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HealingStore, HealingReport, HealingTestimony } from '../database/HealingStore';
import { Soul } from '../types';
import PhoneInput from './PhoneInput';
import { useNotification } from './ui/NotificationSystem';
import { User } from '../types';

interface HealingDashboardProps {
    currentUser: User;
}

const HealingDashboard: React.FC<HealingDashboardProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { showToast, confirm } = useNotification();
    const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'souls' | 'testimonies' | 'new'>('overview');
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState<HealingReport[]>([]);
    const [allSouls, setAllSouls] = useState<Soul[]>([]);
    const [allTestimonies, setAllTestimonies] = useState<HealingTestimony[]>([]);
    const [stats, setStats] = useState({ totalReports: 0, totalTestimonies: 0, totalSouls: 0 });

    // Form State
    const [formData, setFormData] = useState<{
        date: string;
        hospital_name: string;
        labourers_count: number | '';
        people_reached: number | '';
        notes: string;
    }>({
        date: new Date().toISOString().split('T')[0],
        hospital_name: '',
        labourers_count: '',
        people_reached: '',
        notes: ''
    });

    // Souls & Testimonies State for the Form
    const [soulsList, setSoulsList] = useState<Partial<Soul>[]>([]);
    const [testimoniesList, setTestimoniesList] = useState<{ content: string; testifier_name: string; testifier_contact: string }[]>([]);

    // Temporary inputs
    const [tempSoul, setTempSoul] = useState({ firstName: '', lastName: '', phone: '', gender: 'Male' });
    const [tempTestimony, setTempTestimony] = useState({ content: '', testifier_name: '', testifier_contact: '' });

    // Editing State
    const [editingSoul, setEditingSoul] = useState<Soul | null>(null);
    const [editingTestimony, setEditingTestimony] = useState<HealingTestimony | null>(null);
    const [editingReport, setEditingReport] = useState<HealingReport | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reportsData, statsData, soulsData, testimoniesData] = await Promise.all([
                HealingStore.getAllReports(),
                HealingStore.getStats(),
                HealingStore.getSouls(),
                HealingStore.getTestimonies()
            ]);
            setReports(reportsData);
            setStats(statsData);
            setAllSouls(soulsData);
            setAllTestimonies(testimoniesData);
        } catch (error) {
            showToast('Failed to load healing data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSoul = () => {
        if (!tempSoul.firstName || !tempSoul.lastName) {
            showToast('First and Last Name are required', 'error');
            return;
        }
        setSoulsList([...soulsList, { ...tempSoul, gender: tempSoul.gender as 'Male' | 'Female' }]);
        setTempSoul({ firstName: '', lastName: '', phone: '', gender: 'Male' });
    };

    const handleAddTestimony = () => {
        if (!tempTestimony.content) {
            showToast('Testimony content is required', 'error');
            return;
        }
        setTestimoniesList([...testimoniesList, tempTestimony]);
        setTempTestimony({ content: '', testifier_name: '', testifier_contact: '' });
    };

    const handleSubmit = async () => {
        if (!formData.hospital_name) {
            showToast('Hospital Name is required', 'error');
            return;
        }

        try {
            setLoading(true);
            // Check if we are updating (though logic for edit relies on editingReport state which isn't fully shown here but usually wraps this)
            // Existing code showed distinct update logic or combined.
            // Let's stick to the visible createReport call in the snippet I read, but wait, the previous tool failure message implies I should be careful.
            // The VIEWED file lines 88-124 show a createReport call.
            // I will update that call.

            if (editingReport && editingReport.id) {
                await HealingStore.updateReport(editingReport.id, {
                    ...formData,
                    labourers_count: Number(formData.labourers_count) || 0,
                    souls_count: soulsList.length,
                    people_reached: Number(formData.people_reached) || 0,
                });
                showToast('Report updated successfully', 'success');
                setEditingReport(null);
            } else {
                await HealingStore.createReport({
                    ...formData,
                    labourers_count: Number(formData.labourers_count) || 0,
                    souls_count: soulsList.length,
                    people_reached: Number(formData.people_reached) || 0,
                    testimonies: testimoniesList,
                    souls: soulsList,
                    captured_by: currentUser.id
                });
                showToast('Report submitted successfully!', 'success');
            }

            setActiveTab('overview');
            setFormData({
                date: new Date().toISOString().split('T')[0],
                hospital_name: '',
                labourers_count: '',
                people_reached: '',
                notes: ''
            });
            setSoulsList([]);
            setTestimoniesList([]);
            loadData(); // Refresh data
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSoul = async () => {
        if (!editingSoul || !editingSoul.id) return;
        try {
            await HealingStore.updateSoul(editingSoul.id, editingSoul);
            showToast('Soul updated successfully', 'success');
            setEditingSoul(null);
            loadData();
        } catch (error) {
            showToast('Failed to update soul', 'error');
        }
    };

    const handleDeleteSoul = async (id: string) => {
        if (await confirm('Are you sure you want to delete this soul? This action cannot be undone.', {
            title: 'Delete Soul',
            isDestructive: true
        })) {
            try {
                await HealingStore.deleteSoul(id);
                setAllSouls(prev => prev.filter(s => s.id !== id));
                showToast('Soul deleted successfully', 'success');
                loadData();
            } catch (error) {
                showToast('Failed to delete soul', 'error');
            }
        }
    };

    const handleUpdateTestimony = async () => {
        if (!editingTestimony || !editingTestimony.id) return;
        try {
            await HealingStore.updateTestimony(editingTestimony.id, editingTestimony);
            showToast('Testimony updated successfully', 'success');
            setEditingTestimony(null);
            loadData();
        } catch (error) {
            showToast('Failed to update testimony', 'error');
        }
    };

    const handleEditReport = (report: HealingReport) => {
        setEditingReport(report);
        setFormData({
            date: report.date.split('T')[0],
            hospital_name: report.hospital_name,
            labourers_count: report.labourers_count || '',
            people_reached: report.people_reached || '',
            notes: report.notes || ''
        });

        // Populate Testimonies
        setTestimoniesList(
            report.healing_testimonies?.map(t => ({
                content: t.content,
                testifier_name: t.testifier_name || '',
                testifier_contact: t.testifier_contact || ''
            })) || []
        );

        // Populate Souls
        // Filter souls that belong to this report
        const reportSouls = allSouls.filter(s => (s as any).source_id === report.id || s.sourceId === report.id);
        const mappedSouls = reportSouls.map(s => ({
            ...s, // Keep original IDs to allow updating
        }));
        setSoulsList(mappedSouls);

        setActiveTab('new');
    };

    const handleDeleteReport = async (id: string) => {
        if (await confirm('Are you sure you want to delete this report? This action cannot be undone and may affect linked records.', {
            title: 'Delete Report',
            isDestructive: true
        })) {
            try {
                await HealingStore.deleteReport(id);
                setReports(prev => prev.filter(r => r.id !== id));
                showToast('Report deleted successfully', 'success');
                loadData();
            } catch (error) {
                showToast('Failed to delete report', 'error');
            }
        }
    };

    const handleDeleteTestimony = async (id: string) => {
        if (await confirm('Are you sure you want to delete this testimony? This action cannot be undone.', {
            title: 'Delete Testimony',
            isDestructive: true
        })) {
            try {
                await HealingStore.deleteTestimony(id);
                setAllTestimonies(prev => prev.filter(t => t.id !== id));
                showToast('Testimony deleted successfully', 'success');
                loadData();
            } catch (error) {
                showToast('Failed to delete testimony', 'error');
            }
        }
    };

    // Obsolete handleUpdateReport removed as logic is now in handleSubmit

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 relative">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text mb-1">Healing Dept</h1>
                    <p className="text-gray-500">Manage hospital outreaches, souls won, and testimonies.</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => navigate('/')} className="px-4 py-2 border rounded-xl hover:bg-gray-50">
                        <ArrowLeft size={18} />
                    </button>
                    {(activeTab === 'overview' || activeTab === 'reports') && (
                        <button
                            onClick={() => setActiveTab('new')}
                            className="flex items-center space-x-2 bg-ministry-orange text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors font-bold shadow-lg shadow-orange-500/20"
                        >
                            <Plus size={18} />
                            <span>New Outreach Report</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                {(['overview', 'reports', 'souls', 'testimonies'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${activeTab === tab ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={24} /></div>
                                <h3 className="text-gray-500 font-medium">Total Reports</h3>
                            </div>
                            <p className="text-3xl font-black text-gray-800">{stats.totalReports}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Heart size={24} /></div>
                                <h3 className="text-gray-500 font-medium">Souls Won</h3>
                            </div>
                            <p className="text-3xl font-black text-gray-800">{stats.totalSouls}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Activity size={24} /></div>
                                <h3 className="text-gray-500 font-medium">Testimonies</h3>
                            </div>
                            <p className="text-3xl font-black text-gray-800">{stats.totalTestimonies}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
                        {reports.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">No reports yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {reports.slice(0, 5).map(r => (
                                    <div key={r.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{r.hospital_name}</h4>
                                            <p className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString()} • {r.labourers_count} Labourers</p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <span className="block text-lg font-bold text-green-600">{r.souls_count} Souls</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'souls' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Souls Won via Healing Dept</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Date Joined</th>
                                    <th className="px-6 py-4 font-medium">Name</th>
                                    <th className="px-6 py-4 font-medium">Phone</th>
                                    <th className="px-6 py-4 font-medium">Gender</th>
                                    <th className="px-6 py-4 font-medium">Outreach</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {allSouls.map((soul) => (
                                    <tr key={soul.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">{new Date(soul.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">{soul.first_name} {soul.last_name}</td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{soul.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">{soul.gender}</td>
                                        <td className="px-6 py-4 text-gray-500 text-sm italic">{soul.notes?.replace('Healing Outreach: ', '') || '-'}</td>
                                        <td className="px-6 py-4 flex space-x-2">
                                            <button
                                                onClick={() => setEditingSoul(soul as Soul)}
                                                className="p-1 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => soul.id && handleDeleteSoul(soul.id)}
                                                className="p-1 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {allSouls.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No souls found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'testimonies' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Testimonies Database</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allTestimonies.map((testimony) => (
                            <div key={testimony.id} className="group relative p-6 bg-blue-50/50 border border-blue-100 rounded-2xl hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{testimony.testifier_name || 'Anonymous'}</h4>
                                        <p className="text-xs text-blue-600">{testimony.testifier_contact || 'No contact'}</p>
                                    </div>
                                    <div className="bg-white p-2 rounded-full text-blue-500 shadow-sm">
                                        <Heart size={16} />
                                    </div>
                                </div>
                                <p className="text-gray-700 text-sm mb-4 line-clamp-4 italic">"{testimony.content}"</p>
                                <div className="text-xs text-gray-400 pt-3 border-t border-blue-100 flex justify-between">
                                    <span>{new Date(testimony.created_at).toLocaleDateString()}</span>
                                    {/* @ts-ignore */}
                                    <span>{testimony.healing_reports?.hospital_name}</span>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                    <button
                                        onClick={() => setEditingTestimony(testimony)}
                                        className="p-1.5 bg-white text-blue-500 rounded-full shadow-sm hover:bg-blue-50"
                                        title="Edit"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => testimony.id && handleDeleteTestimony(testimony.id)}
                                        className="p-1.5 bg-white text-red-500 rounded-full shadow-sm hover:bg-red-50"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {allTestimonies.length === 0 && (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            No testimonies recorded yet.
                        </div>
                    )}
                </div>
            )
            }

            {
                activeTab === 'reports' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">All Outreach Reports</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Date</th>
                                        <th className="px-6 py-4 font-medium">Hospital</th>
                                        <th className="px-6 py-4 font-medium">Labourers</th>
                                        <th className="px-6 py-4 font-medium">Souls Won</th>
                                        <th className="px-6 py-4 font-medium">Testimonies</th>
                                        <th className="px-6 py-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-600">{new Date(report.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-semibold text-gray-900">{report.hospital_name}</td>
                                            <td className="px-6 py-4 text-gray-600">{report.labourers_count}</td>
                                            <td className="px-6 py-4 text-green-600 font-bold">{report.souls_count}</td>
                                            <td className="px-6 py-4 text-gray-600">{report.healing_testimonies?.length || 0}</td>
                                            <td className="px-6 py-4 flex space-x-2">
                                                <button
                                                    onClick={() => handleEditReport(report)}
                                                    className="p-1 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReport(report.id)}
                                                    className="p-1 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'new' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Outreach Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Labourers</label>
                                        <input
                                            type="number"
                                            value={formData.labourers_count}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFormData({
                                                    ...formData,
                                                    labourers_count: val === '' ? '' : parseInt(val)
                                                });
                                            }}
                                            onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange no-spinner"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">People Reached</label>
                                        <input
                                            type="number"
                                            value={formData.people_reached}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFormData({
                                                    ...formData,
                                                    people_reached: val === '' ? '' : parseInt(val)
                                                });
                                            }}
                                            onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange no-spinner"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                                        <input
                                            type="text"
                                            value={formData.hospital_name}
                                            onChange={e => setFormData({ ...formData, hospital_name: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange"
                                            placeholder="e.g. Mulago Hospital"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-ministry-orange"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Testimonies Section */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Testimonies</h3>
                                <div className="flex flex-col gap-4 mb-4">
                                    <input
                                        type="text"
                                        placeholder="Testifier Name (Optional)"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={tempTestimony.testifier_name}
                                        onChange={e => setTempTestimony({ ...tempTestimony, testifier_name: e.target.value })}
                                    />
                                    <div className="w-full">
                                        <PhoneInput
                                            value={tempTestimony.testifier_contact}
                                            onChange={(val) => setTempTestimony({ ...tempTestimony, testifier_contact: val })}
                                            placeholder="Phone"
                                        />
                                    </div>
                                    <textarea
                                        placeholder="Testimony..."
                                        className="w-full px-4 py-2 border rounded-xl min-h-[100px]"
                                        value={tempTestimony.content}
                                        onChange={e => setTempTestimony({ ...tempTestimony, content: e.target.value })}
                                    />
                                    <button
                                        onClick={handleAddTestimony}
                                        className="w-full flex items-center justify-center space-x-2 bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                                    >
                                        <Plus size={20} />
                                        <span>Add Testimony</span>
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {testimoniesList.map((t, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-blue-50 text-blue-800 rounded-lg">
                                            <div className="text-sm">
                                                <span className="font-bold">{t.testifier_name || 'Anonymous'}</span>
                                                {t.testifier_contact && <span className="text-xs text-blue-600 ml-2">({t.testifier_contact})</span>}
                                                <span className="mx-2">:</span>
                                                <span>{t.content}</span>
                                            </div>
                                            <button
                                                onClick={() => setTestimoniesList(list => list.filter((_, i) => i !== idx))}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {testimoniesList.length === 0 && <p className="text-sm text-gray-400 italic">No testimonies added.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: Souls Entry */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                                <span>Souls Won</span>
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{soulsList.length} Added</span>
                            </h3>

                            <div className="space-y-3 mb-6">
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    className="w-full px-4 py-2 border rounded-xl"
                                    value={tempSoul.firstName}
                                    onChange={e => setTempSoul({ ...tempSoul, firstName: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    className="w-full px-4 py-2 border rounded-xl"
                                    value={tempSoul.lastName}
                                    onChange={e => setTempSoul({ ...tempSoul, lastName: e.target.value })}
                                />
                                <PhoneInput
                                    value={tempSoul.phone}
                                    onChange={(val) => setTempSoul({ ...tempSoul, phone: val })}
                                    placeholder="Phone Number"
                                />
                                <select
                                    className="w-full px-4 py-2 border rounded-xl"
                                    value={tempSoul.gender}
                                    onChange={e => setTempSoul({ ...tempSoul, gender: e.target.value })}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                                <button
                                    onClick={handleAddSoul}
                                    className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold transition-colors"
                                >
                                    <Plus size={18} />
                                    <span>Add Soul</span>
                                </button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {soulsList.map((s, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="text-sm">
                                            <div className="font-bold text-gray-800">{s.firstName} {s.lastName}</div>
                                            <div className="text-xs text-gray-500">{s.phone}</div>
                                        </div>
                                        <button
                                            onClick={() => setSoulsList(list => list.filter((_, i) => i !== idx))}
                                            className="text-red-400 hover:text-red-600"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {soulsList.length === 0 && <p className="text-sm text-gray-400 text-center italic">No souls captured yet.</p>}
                            </div>

                            <hr className="my-6 border-gray-100" />

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`w-full flex items-center justify-center space-x-2 bg-ministry-orange text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 ${loading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-orange-600'
                                    }`}
                            >
                                <Save size={18} />
                                <span>{loading ? 'Submitting...' : 'Submit Report'}</span>
                            </button>
                        </div>
                    </div>
                )
            }
            {/* Edit Soul Modal */}
            {editingSoul && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold">Edit Soul</h3>
                        <div className="space-y-3">
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingSoul.first_name || ''}
                                onChange={e => setEditingSoul({ ...editingSoul, first_name: e.target.value })}
                                placeholder="First Name"
                            />
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingSoul.last_name || ''}
                                onChange={e => setEditingSoul({ ...editingSoul, last_name: e.target.value })}
                                placeholder="Last Name"
                            />
                            <PhoneInput
                                value={editingSoul.phone || ''}
                                onChange={val => setEditingSoul({ ...editingSoul, phone: val })}
                                placeholder="Phone"
                            />
                            <textarea
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingSoul.notes || ''}
                                onChange={e => setEditingSoul({ ...editingSoul, notes: e.target.value })}
                                placeholder="Notes"
                                rows={2}
                            />
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={() => setEditingSoul(null)}
                                className="flex-1 py-2 rounded-xl border hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateSoul}
                                className="flex-1 py-2 rounded-xl bg-ministry-orange text-white font-medium hover:bg-orange-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Testimony Modal */}
            {editingTestimony && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold">Edit Testimony</h3>
                        <div className="space-y-3">
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingTestimony.testifier_name || ''}
                                onChange={e => setEditingTestimony({ ...editingTestimony, testifier_name: e.target.value })}
                                placeholder="Testifier Name"
                            />
                            <PhoneInput
                                value={editingTestimony.testifier_contact || ''}
                                onChange={val => setEditingTestimony({ ...editingTestimony, testifier_contact: val })}
                                placeholder="Contact"
                            />
                            <textarea
                                className="w-full px-4 py-2 border rounded-xl min-h-[150px]"
                                value={editingTestimony.content || ''}
                                onChange={e => setEditingTestimony({ ...editingTestimony, content: e.target.value })}
                                placeholder="Testimony Content"
                            />
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={() => setEditingTestimony(null)}
                                className="flex-1 py-2 rounded-xl border hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateTestimony}
                                className="flex-1 py-2 rounded-xl bg-ministry-orange text-white font-medium hover:bg-orange-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealingDashboard;
