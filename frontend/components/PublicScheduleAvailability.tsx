import React, { useState, useEffect } from 'react';
import { Globe, CheckCircle, Clock, Calendar, Users, Briefcase, Search, ChevronDown } from 'lucide-react';
import { apiFetchPublic } from '../services/api';
import { useNotification } from './ui/NotificationSystem';

const PublicScheduleAvailability: React.FC = () => {
    const { showToast } = useNotification();
    const pathParts = window.location.pathname.split('/');
    const scheduleId = pathParts[pathParts.length - 1];

    const [status, setStatus] = useState<'loading' | 'active' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [data, setData] = useState<any>(null);

    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [memberSearch, setMemberSearch] = useState('');
    const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
    
    const [selections, setSelections] = useState<Record<string, { roleId: string, roleLabel: string, arrivalTime: string }>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!scheduleId) {
                setStatus('error');
                setErrorMsg('Invalid Schedule Link');
                return;
            }
            try {
                const response = await apiFetchPublic(`/public/schedules/${scheduleId}`);
                if (response.schedule) {
                    if (response.schedule.status !== 'Draft') {
                        setStatus('error');
                        setErrorMsg('This schedule is no longer accepting submissions.');
                        return;
                    }
                    setData(response);
                    
                    // Initialize default arrival times
                    const initialSelections: any = {};
                    response.sessions.forEach((s: any) => {
                        initialSelections[s.id] = { roleId: '', roleLabel: '', arrivalTime: s.arrival_time };
                    });
                    setSelections(initialSelections);
                    
                    setStatus('active');
                } else {
                    setStatus('error');
                    setErrorMsg('Schedule not found or link expired.');
                }
            } catch (e) {
                setStatus('error');
                setErrorMsg('Failed to load schedule details.');
            }
        };
        fetchData();
    }, [scheduleId]);

    const handleSubmit = async () => {
        if (!selectedMemberId) {
            showToast('Please select your name from the list.', 'warning');
            return;
        }

        const member = data.members.find((m: any) => m.member_id === selectedMemberId);
        if (!member) return;

        const assignmentsToSubmit = [];
        for (const sessionId of Object.keys(selections)) {
            const sel = selections[sessionId];
            if (sel.roleId && sel.roleLabel) {
                const session = data?.sessions?.find((s: any) => s.id === sessionId);
                assignmentsToSubmit.push({
                    sessionId,
                    memberId: selectedMemberId,
                    roleLabel: sel.roleLabel,
                    ministerName: member.members?.name || 'Unknown Member',
                    arrivalTime: sel.arrivalTime || session?.arrival_time
                });
            }
        }

        if (assignmentsToSubmit.length === 0) {
            showToast('Please select a role for at least one session.', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            await apiFetchPublic(`/public/schedules/${scheduleId}/availability`, {
                method: 'POST',
                body: JSON.stringify({ assignments: assignmentsToSubmit })
            });
            setStatus('success');
        } catch (e: any) {
            showToast(e.message || 'Failed to submit availability', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (status === 'loading') {
        return <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 text-gray-500">Loading Schedule...</div>;
    }

    if (status === 'success') {
        return (
            <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-green-100 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                    <p className="text-gray-600 mb-6">Your availability for <strong>{data?.schedule?.title}</strong> has been submitted successfully.</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Notice</h2>
                    <p className="text-gray-500">{errorMsg}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-gray-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-black text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="bg-ministry-neon p-1.5 rounded-lg">
                            <Calendar className="w-4 h-4 text-black" />
                        </div>
                        <span className="font-bold tracking-wider text-sm">Schedule Availability</span>
                    </div>
                    <div className="text-xs text-white/60">
                        {data?.schedule?.departments?.name}
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto p-4 md:pt-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{data?.schedule?.title}</h1>
                    <p className="text-gray-500 text-sm mt-2 flex items-center justify-center">
                        <Calendar className="w-4 h-4 mr-1.5" /> 
                        Week of {new Date(data?.schedule?.week_start).toLocaleDateString()}
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 relative">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-ministry-orange" />
                        Select your name *
                    </label>
                    
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-ministry-orange/20 focus:border-ministry-orange transition-all flex items-center justify-between"
                        >
                            <span className={selectedMemberId ? "font-bold text-gray-900" : "text-gray-500"}>
                                {selectedMemberId && data?.members ? data.members.find((m: any) => m.member_id === selectedMemberId)?.members?.name : "-- Select your name --"}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isMemberDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isMemberDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsMemberDropdownOpen(false)}></div>
                                <div className="absolute z-20 top-full mt-2 left-0 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[300px]">
                                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search names..."
                                                value={memberSearch}
                                                onChange={e => setMemberSearch(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange shadow-sm"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto p-1 relative">
                                        {data?.members?.filter((m: any) => m.members?.name?.toLowerCase().includes(memberSearch.toLowerCase())).length === 0 ? (
                                            <div className="p-6 text-center text-gray-500 text-sm">No members found matching "{memberSearch}"</div>
                                        ) : (
                                            data?.members?.filter((m: any) => m.members?.name?.toLowerCase().includes(memberSearch.toLowerCase())).map((m: any) => (
                                                <button
                                                    key={m.member_id}
                                                    type="button"
                                                    onMouseDown={() => {
                                                        setSelectedMemberId(m.member_id);
                                                        setIsMemberDropdownOpen(false);
                                                        setMemberSearch('');
                                                    }}
                                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${selectedMemberId === m.member_id ? 'bg-ministry-orange/10 text-ministry-orange font-bold' : 'hover:bg-gray-50 text-gray-700'}`}
                                                >
                                                    {m.members?.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Select your roles for this week:</h3>
                    
                    {[...(data?.sessions || [])].sort((a: any, b: any) => {
                        const dateA = new Date(`${a.session_date}T${a.arrival_time || '00:00'}`).getTime();
                        const dateB = new Date(`${b.session_date}T${b.arrival_time || '00:00'}`).getTime();
                        return dateA - dateB;
                    }).map((session: any) => (
                        <div key={session.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-ministry-orange/40"></div>
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{session.session_label}</h4>
                                    <p className="text-sm text-gray-500 flex items-center mt-1">
                                        <Calendar className="w-3.5 h-3.5 mr-1" />
                                        {new Date(session.session_date).toLocaleDateString()} 
                                    </p>
                                    <p className="text-sm text-gray-500 flex items-center mt-0.5">
                                        <Clock className="w-3.5 h-3.5 mr-1" />
                                        Expected by {session.arrival_time}
                                    </p>
                                </div>
                                
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center">
                                            <Briefcase className="w-3 h-3 mr-1" /> Role
                                        </label>
                                        <select
                                            value={selections[session.id]?.roleId || ''}
                                            onChange={e => {
                                                const selectedOption = e.target.options[e.target.selectedIndex];
                                                const isVal = e.target.value !== '';
                                                setSelections(prev => ({
                                                    ...prev,
                                                    [session.id]: {
                                                        ...prev[session.id],
                                                        roleId: e.target.value,
                                                        roleLabel: isVal ? selectedOption.text : ''
                                                    }
                                                }));
                                            }}
                                            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-ministry-orange focus:border-ministry-orange"
                                        >
                                            <option value="">Not available</option>
                                            {data?.roles?.map((r: any) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.role_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className={`transition-opacity duration-200 ${selections[session.id]?.roleId ? 'opacity-100' : 'opacity-40'}`}>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center">
                                            <Clock className="w-3 h-3 mr-1" /> Your Arrival Time
                                        </label>
                                        <input
                                            type="time"
                                            disabled={!selections[session.id]?.roleId}
                                            value={selections[session.id]?.arrivalTime || session.arrival_time}
                                            onChange={e => {
                                                setSelections(prev => ({
                                                    ...prev,
                                                    [session.id]: {
                                                        ...prev[session.id],
                                                        arrivalTime: e.target.value
                                                    }
                                                }));
                                            }}
                                            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-ministry-orange focus:border-ministry-orange disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-4 bg-ministry-orange text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/20"
                    >
                        {submitting ? 'Submitting...' : 'Submit Availability'}
                    </button>
                </div>
                
                <div className="mt-8 text-center text-xs text-gray-400">
                    Manifest Management System &copy; {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
};

export default PublicScheduleAvailability;
