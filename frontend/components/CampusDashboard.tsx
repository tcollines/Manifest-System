import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MinistryEvent, ModalType, CampusActivity, CampusFinance } from '../types';
import { Building2, Users, HeartHandshake, GraduationCap, DollarSign, Calendar } from 'lucide-react';
import { CampusStore } from '../database/campusStore';
import { ActivityTab } from './campus/ActivityTab';
import { FinanceTab } from './campus/FinanceTab';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center space-x-4">
        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-50">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

interface CampusDashboardProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
    urlTab?: 'families' | 'evangelism' | 'vacists' | 'alumni' | 'finance';
}

export default function CampusDashboard({ currentUser, events, onOpenModal, urlTab }: CampusDashboardProps) {
    const navigate = useNavigate();

    // [PHASE F] activeTab is URL-driven when urlTab prop is provided.
    const [activeTab, setActiveTab] = useState<'families' | 'evangelism' | 'vacists' | 'alumni' | 'finance'>(urlTab || 'families');

    useEffect(() => {
        if (urlTab) setActiveTab(urlTab);
    }, [urlTab]);

    const [selectedEventId, setSelectedEventId] = useState<string>(''); // For filtering

    // Dashboard Data State
    const [activities, setActivities] = useState<CampusActivity[]>([]);

    // Dashboard Stats
    const [totalSouls, setTotalSouls] = useState(0);
    const [totalFamilies, setTotalFamilies] = useState(0);
    const [totalEvangelisms, setTotalEvangelisms] = useState(0);
    const [totalAlumni, setTotalAlumni] = useState(0);
    const [financeRecords, setFinanceRecords] = useState<CampusFinance[]>([]);

    useEffect(() => {
        fetchStats();
    }, [selectedEventId]);

    const fetchStats = async () => {
        try {
            const fetchedActivities = await CampusStore.getActivities(selectedEventId);
            if (fetchedActivities) {
                setActivities(fetchedActivities);
                setTotalFamilies(fetchedActivities.filter(a => a.category === 'Family').length);
                setTotalEvangelisms(fetchedActivities.filter(a => a.category === 'Evangelism').length);
                setTotalAlumni(fetchedActivities.filter(a => a.category === 'Alumni').length);

                // Calculate total souls won from the activities
                const total = fetchedActivities.reduce((acc, current) => acc + (current.soulsWon || 0), 0);
                setTotalSouls(total);
            }

            const fetchedFinance = await CampusStore.getFinanceRecords(selectedEventId);
            if (fetchedFinance) {
                setFinanceRecords(fetchedFinance);
            }
        } catch (e) {
            console.error('Failed to fetch campus data', e);
        }
    };

    const tabs = [
        { id: 'families', label: 'Families', icon: Users },
        { id: 'evangelism', label: 'Evangelism', icon: HeartHandshake },
        { id: 'vacists', label: 'Vacists Fellowship', icon: GraduationCap },
        { id: 'alumni', label: 'Alumni Fellowship', icon: Building2 },
        { id: 'finance', label: 'Finance', icon: DollarSign }
    ];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text">Campus & Institutions</h1>
                    <p className="text-ministry-muted mt-2">Manage campus fellowships, evangelism, and related activities</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ministry-orange transition-all shadow-sm"
                        >
                            <option value="">All Events</option>
                            {events.map(event => (
                                <option key={event.id} value={event.id}>{event.title} ({event.date})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Souls Won" value={totalSouls.toString()} icon={<Users className="w-6 h-6 text-blue-500" />} />
                <StatCard title="Total Families Setup" value={totalFamilies.toString()} icon={<Building2 className="w-6 h-6 text-green-500" />} />
                <StatCard title="Evangelism Outreaches" value={totalEvangelisms.toString()} icon={<HeartHandshake className="w-6 h-6 text-purple-500" />} />
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 overflow-x-auto whitespace-nowrap hide-scrollbar flex">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); navigate(`/campus/${tab.id}`); }}
                        className={`flex-1 flex justify-center items-center space-x-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap
              ${activeTab === tab.id
                                ? 'border-ministry-orange text-ministry-orange bg-ministry-orange/5'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
                {activeTab === 'families' && (
                    <ActivityTab
                        category="Family"
                        activities={activities}
                        events={events}
                        selectedEventId={selectedEventId}
                        currentUser={currentUser}
                        refreshStats={fetchStats}
                    />
                )}
                {activeTab === 'evangelism' && (
                    <ActivityTab
                        category="Evangelism"
                        activities={activities}
                        events={events}
                        selectedEventId={selectedEventId}
                        currentUser={currentUser}
                        refreshStats={fetchStats}
                    />
                )}
                {activeTab === 'vacists' && (
                    <ActivityTab
                        category="Vacists"
                        activities={activities}
                        events={events}
                        selectedEventId={selectedEventId}
                        currentUser={currentUser}
                        refreshStats={fetchStats}
                    />
                )}
                {activeTab === 'alumni' && (
                    <ActivityTab
                        category="Alumni"
                        activities={activities}
                        events={events}
                        selectedEventId={selectedEventId}
                        currentUser={currentUser}
                        refreshStats={fetchStats}
                    />
                )}
                {activeTab === 'finance' && (
                    <FinanceTab financeRecords={financeRecords} />
                )}
            </div>
        </div>
    );
};
