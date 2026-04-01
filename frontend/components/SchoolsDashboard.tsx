import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MinistryEvent, SchoolOutreachReport, ModalType } from '../types';
import { SchoolsStore, mapSchoolReportFromDB } from '../database/schoolsStore';
import { supabase } from '../services/supabaseClient';
import { BookOpen, FileText, Calendar } from 'lucide-react';
import { ReportsTab } from './schools/ReportsTab';
import { EventsTab } from './schools/EventsTab';

interface SchoolsDashboardProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
    urlTab?: 'reports' | 'events';
}

export const SchoolsDashboard: React.FC<SchoolsDashboardProps> = ({
    currentUser,
    events = [],
    onOpenModal,
    urlTab
}) => {
    const navigate = useNavigate();

    // [PHASE F] activeTab is URL-driven when urlTab prop is provided.
    const [activeTab, setActiveTab] = useState<'reports' | 'events'>(urlTab || 'reports');

    useEffect(() => {
        if (urlTab) {
            setActiveTab(urlTab);
        }
    }, [urlTab]);

    const [reports, setReports] = useState<SchoolOutreachReport[]>([]);
    const [reportEventId, setReportEventId] = useState<string>(''); // For filtering reports

    useEffect(() => {
        loadReports(reportEventId);

        const channel = supabase.channel('schools-reports-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'school_outreach_reports' }, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'INSERT') {
                    const mapped = mapSchoolReportFromDB(newRecord);
                    if (!reportEventId || mapped.eventId === reportEventId) {
                        setReports(prev => [mapped, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    }
                } else if (eventType === 'UPDATE') {
                    const mapped = mapSchoolReportFromDB(newRecord);
                    if (!reportEventId || mapped.eventId === reportEventId) {
                        setReports(prev => prev.map(r => r.id === mapped.id ? mapped : r).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    } else {
                        setReports(prev => prev.filter(r => r.id !== mapped.id));
                    }
                } else if (eventType === 'DELETE') {
                    setReports(prev => prev.filter(r => r.id !== oldRecord.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [reportEventId]);

    const loadReports = async (eventId?: string) => {
        const data = await SchoolsStore.getAllReports(eventId);
        setReports(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-ministry-orange" />
                        Schools Department
                    </h1>
                    <p className="text-gray-500">Manage outreach reports and student event attendance.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                <button
                    onClick={() => { setActiveTab('reports'); navigate('/schools/reports'); }}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'reports' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Outreach Reports</span>
                </button>
                <button
                    onClick={() => { setActiveTab('events'); navigate('/schools/events'); }}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'events' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>Events & Students</span>
                </button>
            </div>

            {/* Content */}
            <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">
                {activeTab === 'reports' && (
                    <ReportsTab
                        reports={reports}
                        events={events}
                        currentUser={currentUser}
                        reportEventId={reportEventId}
                        setReportEventId={setReportEventId}
                        refreshReports={() => loadReports(reportEventId)}
                    />
                )}
                {activeTab === 'events' && (
                    <EventsTab
                        events={events}
                    />
                )}
            </div>
        </div>
    );
};
