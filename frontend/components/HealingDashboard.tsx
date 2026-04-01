import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HealingStore, HealingReport, HealingTestimony } from '../database/HealingStore';
import { Soul } from '../types';
import PhoneInput from './PhoneInput';
import { useNotification } from './ui/NotificationSystem';
import { User } from '../types';
import { OverviewTab } from './healing/OverviewTab';
import { ReportsTab } from './healing/ReportsTab';
import { SoulsTab } from './healing/SoulsTab';
import { TestimoniesTab } from './healing/TestimoniesTab';
import { NewReportTab } from './healing/NewReportTab';

interface HealingDashboardProps {
    currentUser: User;
    urlTab?: 'overview' | 'reports' | 'souls' | 'testimonies' | 'new';
}

const HealingDashboard: React.FC<HealingDashboardProps> = ({ currentUser, urlTab }) => {
    const navigate = useNavigate();
    const { showToast, confirm } = useNotification();
    const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'souls' | 'testimonies' | 'new'>(urlTab || 'overview');

    useEffect(() => {
        if (urlTab) setActiveTab(urlTab);
    }, [urlTab]);

    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState<HealingReport[]>([]);
    const [allSouls, setAllSouls] = useState<Soul[]>([]);
    const [allTestimonies, setAllTestimonies] = useState<HealingTestimony[]>([]);
    const [stats, setStats] = useState({ totalReports: 0, totalTestimonies: 0, totalSouls: 0 });

    // Form State for NewReportTab
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

    const [soulsList, setSoulsList] = useState<Partial<Soul>[]>([]);
    const [testimoniesList, setTestimoniesList] = useState<{ content: string; testifier_name: string; testifier_contact: string }[]>([]);

    const [tempSoul, setTempSoul] = useState({
        fullName: '',
        phone: '',
        gender: 'Male',
        residence: '',
        nextOfKinName: '',
        nextOfKinContact: ''
    });
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
        if (!tempSoul.fullName) {
            showToast('Full Name is required', 'error');
            return;
        }

        const nameParts = tempSoul.fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

        setSoulsList([...soulsList, {
            firstName,
            lastName,
            phone: tempSoul.phone,
            gender: tempSoul.gender as 'Male' | 'Female',
            residence: tempSoul.residence,
            nextOfKinName: tempSoul.nextOfKinName,
            nextOfKinContact: tempSoul.nextOfKinContact
        }]);
        setTempSoul({
            fullName: '',
            phone: '',
            gender: 'Male',
            residence: '',
            nextOfKinName: '',
            nextOfKinContact: ''
        });
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
            navigate('/healing/overview');
            setFormData({
                date: new Date().toISOString().split('T')[0],
                hospital_name: '',
                labourers_count: '',
                people_reached: '',
                notes: ''
            });
            setSoulsList([]);
            setTestimoniesList([]);
            loadData();
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
            const payload = {
                first_name: editingSoul.firstName || editingSoul.first_name,
                last_name: editingSoul.lastName || editingSoul.last_name,
                phone: editingSoul.phone,
                residence: editingSoul.residence,
                next_of_kin_name: editingSoul.nextOfKinName,
                next_of_kin_contact: editingSoul.nextOfKinContact,
                notes: editingSoul.notes
            };
            await HealingStore.updateSoul(editingSoul.id, payload as any);
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
        const reportSouls = allSouls.filter(s => (s as any).source_id === report.id || s.sourceId === report.id);
        const mappedSouls = reportSouls.map(s => ({ ...s }));
        setSoulsList(mappedSouls);

        setActiveTab('new');
        navigate('/healing/new');
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

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 relative">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text mb-1">Healing Dept</h1>
                    <p className="text-gray-500">Manage hospital outreaches, souls won, and testimonies.</p>
                </div>
                <div className="flex space-x-3">
                    {(activeTab === 'overview' || activeTab === 'reports') && (
                        <button
                            onClick={() => {
                                setActiveTab('new');
                                navigate('/healing/new');
                            }}
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
                        onClick={() => {
                            setActiveTab(tab);
                            navigate(`/healing/${tab}`);
                        }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${activeTab === tab ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === 'overview' && <OverviewTab stats={stats} reports={reports} />}

            {activeTab === 'souls' && (
                <SoulsTab
                    allSouls={allSouls}
                    setEditingSoul={setEditingSoul}
                    handleDeleteSoul={handleDeleteSoul}
                />
            )}

            {activeTab === 'testimonies' && (
                <TestimoniesTab
                    allTestimonies={allTestimonies}
                    setEditingTestimony={setEditingTestimony as any}
                    handleDeleteTestimony={handleDeleteTestimony}
                />
            )}

            {activeTab === 'reports' && (
                <ReportsTab
                    reports={reports}
                    handleEditReport={handleEditReport}
                    handleDeleteReport={handleDeleteReport}
                />
            )}

            {activeTab === 'new' && (
                <NewReportTab
                    formData={formData}
                    setFormData={setFormData}
                    tempTestimony={tempTestimony}
                    setTempTestimony={setTempTestimony}
                    testimoniesList={testimoniesList}
                    setTestimoniesList={setTestimoniesList}
                    handleAddTestimony={handleAddTestimony}
                    tempSoul={tempSoul}
                    setTempSoul={setTempSoul}
                    soulsList={soulsList}
                    setSoulsList={setSoulsList}
                    handleAddSoul={handleAddSoul}
                    handleSubmit={handleSubmit}
                    loading={loading}
                />
            )}

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
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                value={editingSoul.residence || ''}
                                onChange={e => setEditingSoul({ ...editingSoul, residence: e.target.value })}
                                placeholder="Place of Residence"
                            />
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Next of Kin (Optional)</p>
                                <div className="space-y-2">
                                    <input
                                        className="w-full px-4 py-2 border rounded-xl bg-gray-50"
                                        value={editingSoul.nextOfKinName || ''}
                                        onChange={e => setEditingSoul({ ...editingSoul, nextOfKinName: e.target.value })}
                                        placeholder="NOK Name"
                                    />
                                    <PhoneInput
                                        value={editingSoul.nextOfKinContact || ''}
                                        onChange={val => setEditingSoul({ ...editingSoul, nextOfKinContact: val })}
                                        placeholder="NOK Contact"
                                    />
                                </div>
                            </div>
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
