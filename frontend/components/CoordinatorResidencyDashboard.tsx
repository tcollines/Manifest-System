import React, { useState, useEffect } from 'react';
import { useResidentStore } from '../database/residentStore';
import { User, Residence, ResidenceOutreachReport, Member } from '../types';
import { MapPin, Users, Calendar, Loader2, Home, ClipboardList } from 'lucide-react';
import { useNotification } from './ui/NotificationSystem';

interface CoordinatorResidencyDashboardProps {
    currentUser: User | null;
}

const CoordinatorResidencyDashboard: React.FC<CoordinatorResidencyDashboardProps> = ({ currentUser }) => {
    const { residences, fetchResidences, fetchResidenceMembers, addReport } = useResidentStore();
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'reports' | 'members'>('reports');

    const [myResidence, setMyResidence] = useState<Residence | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newReport, setNewReport] = useState<Partial<ResidenceOutreachReport>>({
        date: new Date().toISOString().split('T')[0],
        souls_won: 0,
        notes: ''
    });

    useEffect(() => {
        const init = async () => {
            setIsLoadingInit(true);
            try {
                // Force a fresh fetch to ensure we have the latest residences
                await fetchResidences();
            } catch (err) {
                console.error("Failed to fetch residences:", err);
            }
        };
        init();
    }, [fetchResidences]);

    useEffect(() => {
        // Find the residency matching the coordinator's email
        if (residences.length > 0 && currentUser?.email) {
            const match = residences.find(r => r.coordinatorEmail?.toLowerCase() === currentUser.email?.toLowerCase());
            setMyResidence(match || null);
            setIsLoadingInit(false);
        } else if (residences.length > 0) {
            setIsLoadingInit(false);
        }
    }, [residences, currentUser]);

    useEffect(() => {
        // If we found their residency, load their members
        if (myResidence?.id) {
            fetchResidenceMembers(myResidence.id as string).then(data => {
                setMembers(data || []);
            });
        }
    }, [myResidence, fetchResidenceMembers]);

    const handleAddReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myResidence?.id) return;

        setIsSubmitting(true);
        try {
            await addReport({
                ...newReport,
                residence_id: myResidence.id as string
            } as Omit<ResidenceOutreachReport, 'id' | 'manifest_id' | 'created_at' | 'updated_at'>);

            showToast("Outreach report submitted successfully!", "success");
            setNewReport({ date: new Date().toISOString().split('T')[0], souls_won: 0, notes: '' });
        } catch (err: any) {
            console.error("Failed to add report:", err);
            showToast(err.message || "Failed to submit report", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingInit) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-ministry-orange" />
            </div>
        );
    }

    if (!myResidence) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center mt-20">
                <div className="bg-orange-50 p-6 rounded-2xl inline-block mb-4">
                    <MapPin className="w-12 h-12 text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">No Residency Assigned</h1>
                <p className="text-gray-500">
                    Your account ({currentUser?.email}) is not currently assigned as a coordinator for any residential area.
                    Please contact an administrator if you believe this is an error.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header Area */}
            <div className="bg-gradient-to-r from-ministry-dark to-ministry-black rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Home className="w-48 h-48 transform rotate-12" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-ministry-orange mb-2 font-medium">
                        <MapPin className="w-5 h-5" />
                        <span>Assigned Residential Area</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{myResidence.name}</h1>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <Users className="w-4 h-4" />
                            <span>{members.length} Members</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <ClipboardList className="w-4 h-4" />
                            <span>Coordinator View</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <ClipboardList className={`w-4 h-4 ${activeTab === 'reports' ? 'text-ministry-orange' : ''}`} />
                    <span>Outreach Reports</span>
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'members' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Users className={`w-4 h-4 ${activeTab === 'members' ? 'text-ministry-orange' : ''}`} />
                    <span>Community Members</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="mt-6">
                {activeTab === 'reports' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* New Report Form */}
                        <div className="md:col-span-1">
                            <form onSubmit={handleAddReport} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mr-3">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    Submit Report
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={newReport.date || ''}
                                            onChange={e => setNewReport({ ...newReport, date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange"
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Souls Won</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={newReport.souls_won || 0}
                                            onChange={e => setNewReport({ ...newReport, souls_won: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Testimonies (Optional)</label>
                                        <textarea
                                            value={newReport.notes || ''}
                                            onChange={e => setNewReport({ ...newReport, notes: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange h-32 resize-none"
                                            placeholder="Share highlights from the outreach..."
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-6 bg-ministry-orange text-white py-2.5 rounded-xl font-bold hover:bg-orange-600 transition-colors flex justify-center items-center disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
                                </button>
                            </form>
                        </div>

                        {/* Information / History Context Area (Simplified for now) */}
                        <div className="md:col-span-2">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center h-full flex flex-col justify-center items-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <Calendar className="w-8 h-8 text-blue-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Track Your Impact</h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    Use the form to log souls won during community outreach. Your entries help track total community growth across all residential areas.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center text-lg">
                                <Users className="w-5 h-5 mr-2 text-gray-500" />
                                Residence Roster
                            </h3>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                                {members.length} Total
                            </span>
                        </div>

                        {members.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {members.map((m, idx) => (
                                    <div key={m.id || idx} className="p-4 md:p-6 hover:bg-orange-50/30 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600 shadow-sm text-lg">
                                                {m.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-lg">{m.name}</h4>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                    <span>{m.phone || 'No phone number'}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                        {m.category || 'Member'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="bg-gray-50 p-4 rounded-full mb-4">
                                    <Users className="w-8 h-8 text-gray-400" />
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">No Members Added Yet</h4>
                                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                                    Members assigned to {myResidence.name} by administrators will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Add Plus icon locally if not imported globally in this file usually
const Plus = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

export default CoordinatorResidencyDashboard;
