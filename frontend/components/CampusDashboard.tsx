import React, { useState, useEffect } from 'react';
import { User, MinistryEvent, ModalType, CampusActivity } from '../types';
import { Building2, Users, HeartHandshake, GraduationCap, DollarSign, Calendar, Shield, Package, FileText, Plus, X, Save, Edit2, Trash2 } from 'lucide-react';
import { CampusStore } from '../database/campusStore';
import { SoulsStore } from '../database/soulsStore';
import { supabase } from '../services/supabaseClient';
import { useNotification } from './ui/NotificationSystem';
import PhoneInput from './PhoneInput';

const extractJsonArray = (text: string, keyword: string) => {
    const startIdx = text.indexOf(keyword);
    if (startIdx === -1) return null;
    const arrayStart = text.indexOf('[', startIdx);
    if (arrayStart === -1 || arrayStart > startIdx + keyword.length + 5) return null;

    let bracketCount = 0;
    let inString = false;
    let escape = false;
    for (let i = arrayStart; i < text.length; i++) {
        const char = text[i];
        if (escape) { escape = false; continue; }
        if (char === '\\') { escape = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString) {
            if (char === '[') bracketCount++;
            else if (char === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                    try {
                        return {
                            data: JSON.parse(text.substring(arrayStart, i + 1)),
                            originalString: text.substring(startIdx, i + 1)
                        };
                    } catch (e) {
                        return null;
                    }
                }
            }
        }
    }
    return null;
};

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
}

export default function CampusDashboard({ currentUser, events, onOpenModal }: CampusDashboardProps) {
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'families' | 'evangelism' | 'vacists' | 'alumni' | 'finance'>('families');

    // Modal State
    const [isAddingActivity, setIsAddingActivity] = useState(false);
    const [newActivity, setNewActivity] = useState<Partial<CampusActivity>>({});
    const [selectedActivity, setSelectedActivity] = useState<CampusActivity | null>(null);

    // Dynamic Form Arrays
    const [newSouls, setNewSouls] = useState<{ name: string, contact: string, residence: string, institution: string }[]>([]);
    const [newAttendants, setNewAttendants] = useState<{ name: string, contact: string, residence: string, course: string, institution: string }[]>([]);
    const [newContacts, setNewContacts] = useState<{ name: string, contact: string, institution: string }[]>([]);

    // Dashboard Data State
    const [activities, setActivities] = useState<CampusActivity[]>([]);


    // Dashboard Stats
    const [totalSouls, setTotalSouls] = useState(0);
    const [totalFamilies, setTotalFamilies] = useState(0);
    const [totalEvangelisms, setTotalEvangelisms] = useState(0);
    const [totalAlumni, setTotalAlumni] = useState(0);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const fetchedActivities = await CampusStore.getActivities();
            if (fetchedActivities) {
                setActivities(fetchedActivities);
                setTotalFamilies(fetchedActivities.filter(a => a.category === 'Family').length);
                setTotalEvangelisms(fetchedActivities.filter(a => a.category === 'Evangelism').length);
                setTotalAlumni(fetchedActivities.filter(a => a.category === 'Alumni').length);

                // Calculate total souls won from the activities
                const total = fetchedActivities.reduce((acc, current) => acc + (current.soulsWon || 0), 0);
                setTotalSouls(total);
            }
        } catch (e) {
            console.error('Failed to fetch campus data', e);
        }
    };

    const handleSubmitActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Compile structured data into notes for easy viewing, or insert into respective DBs.
            let structuredNotes = newActivity.notes || '';
            let appendNotes = '';
            if (newSouls.length > 0) appendNotes += 'Souls Won:\n' + JSON.stringify(newSouls, null, 2) + '\n';
            if (newAttendants.length > 0) appendNotes += 'Attendants:\n' + JSON.stringify(newAttendants, null, 2) + '\n';
            if (newContacts.length > 0) appendNotes += 'Contacts:\n' + JSON.stringify(newContacts, null, 2) + '\n';

            if (appendNotes) {
                structuredNotes = structuredNotes ? structuredNotes + '\n\n' + appendNotes : appendNotes;
            }

            // If we are editing an existing record, the incoming `newActivity.soulsWon` field
            // already includes the previously-added dynamic arrays. In the edit parser, we extract these records
            // out of the notes and push them into newSouls, etc.
            // If we just add newSouls.length to newActivity.soulsWon, we'll double count. 
            // So we need to compute from scratch, or rely strictly on the dynamic array length + whatever static number the user entered in the standard field (if applicable).
            // For now, if dynamic arrays are used, they denote the total. If not, use the static number.

            const payload = {
                ...newActivity,
                soulsWon: newSouls.length > 0 ? newSouls.length : newActivity.soulsWon || 0,
                contactsCollected: (newContacts.length || newAttendants.length) > 0 ? (newContacts.length + newAttendants.length) : newActivity.contactsCollected || 0,
                notes: structuredNotes.trim() || undefined,
                createdBy: currentUser.name
            };

            if (newActivity.id) {
                await CampusStore.updateActivity(newActivity.id, payload);
                showToast(`${newActivity.category} record updated successfully`);
            } else {
                await CampusStore.createActivity(payload);
                showToast(`${newActivity.category} record saved successfully`);
            }
            setIsAddingActivity(false);
            fetchStats();
        } catch (error) {
            console.error("Error saving activity:", error);
            showToast("Failed to save record", 'error');
        }
    };

    const handleDeleteActivity = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this activity record?")) {
            try {
                await CampusStore.deleteActivity(id);
                showToast("Activity deleted successfully");
                fetchStats();
            } catch (error) {
                console.error("Error deleting activity:", error);
                showToast("Failed to delete activity", 'error');
            }
        }
    };

    const handleEditActivity = (act: CampusActivity, e: React.MouseEvent) => {
        e.stopPropagation();

        let initialSouls: any[] = [];
        let initialAttendants: any[] = [];
        let initialContacts: any[] = [];
        let cleanNotes = '';

        if (act.notes) {
            let notesStr = act.notes;

            // Extract JSON Arrays robustly
            ['Souls Won:', 'Attendants:', 'Contacts:'].forEach(keyword => {
                const extracted = extractJsonArray(notesStr, keyword);
                if (extracted) {
                    if (keyword === 'Souls Won:') initialSouls = extracted.data;
                    if (keyword === 'Attendants:') initialAttendants = extracted.data;
                    if (keyword === 'Contacts:') initialContacts = extracted.data;
                    notesStr = notesStr.replace(extracted.originalString, '');
                }
            });

            // Extract Plain Text format
            const lines = notesStr.split('\n');
            const remainingLines = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith('Souls Won: ') && !line.includes('[')) {
                    const names = line.substring('Souls Won: '.length).split(', ');
                    const mapped = names.filter(n => n.trim()).map(n => {
                        const parts = n.trim().split(' ');
                        const contactParts = parts.filter(p => p.startsWith('+') || !isNaN(Number(p)));
                        const nameParts = parts.filter(p => !contactParts.includes(p));
                        return { name: nameParts.join(' ') || n.trim(), contact: contactParts.join(' '), residence: '', institution: '' };
                    });
                    initialSouls = [...initialSouls, ...mapped];
                } else if (line.startsWith('Attendants: ') && !line.includes('[')) {
                    const names = line.substring('Attendants: '.length).split(', ');
                    const mapped = names.filter(n => n.trim()).map(n => {
                        const parts = n.trim().split(' ');
                        const contactParts = parts.filter(p => p.startsWith('+') || !isNaN(Number(p)));
                        const nameParts = parts.filter(p => !contactParts.includes(p));
                        return { name: nameParts.join(' ') || n.trim(), contact: contactParts.join(' '), residence: '', course: '', institution: '' };
                    });
                    initialAttendants = [...initialAttendants, ...mapped];
                } else if (line.startsWith('Contacts: ') && !line.includes('[')) {
                    const names = line.substring('Contacts: '.length).split(', ');
                    const mapped = names.filter(n => n.trim()).map(n => {
                        const parts = n.trim().split(' ');
                        const contactParts = parts.filter(p => p.startsWith('+') || !isNaN(Number(p)));
                        const nameParts = parts.filter(p => !contactParts.includes(p));
                        return { name: nameParts.join(' ') || n.trim(), contact: contactParts.join(' '), institution: '' };
                    });
                    initialContacts = [...initialContacts, ...mapped];
                } else {
                    remainingLines.push(line);
                }
            }
            cleanNotes = remainingLines.join('\n').trim();
        }

        setNewActivity({ ...act, notes: cleanNotes });
        setNewSouls(initialSouls);
        setNewAttendants(initialAttendants);
        setNewContacts(initialContacts);
        setIsAddingActivity(true);
    };


    const renderActivityTable = (category: 'Family' | 'Evangelism' | 'Vacists' | 'Alumni') => {
        const filtered = activities.filter(a => a.category === category);
        const displayCategory = ['Vacists', 'Alumni'].includes(category) ? `${category} Fellowship` : category;

        return (
            <div className="overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-ministry-text">{displayCategory} Records</h3>
                    <button
                        onClick={() => {
                            setNewActivity({ category, date: new Date().toISOString().split('T')[0], title: '', location: '', soulsWon: 0, contactsCollected: 0, notes: '' });
                            setNewSouls([]);
                            setNewAttendants([]);
                            setNewContacts([]);
                            setIsAddingActivity(true);
                        }}
                        className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded font-medium hover:bg-ministry-orange/90 transition-colors"
                    >
                        <Plus size={16} />
                        <span>Add {displayCategory}</span>
                    </button>
                </div>
                {filtered.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg">No {displayCategory} recorded yet.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                <th className="p-4 font-medium rounded-tl-lg">Date</th>
                                <th className="p-4 font-medium">Title</th>
                                <th className="p-4 font-medium">Location</th>
                                <th className="p-4 font-medium">Souls Won</th>
                                <th className="p-4 font-medium rounded-tr-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filtered.map(act => (
                                <tr
                                    key={act.id}
                                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedActivity(act)}
                                >
                                    <td className="p-4">{new Date(act.date).toLocaleDateString()}</td>
                                    <td className="p-4 font-medium text-ministry-text">{act.title}</td>
                                    <td className="p-4 text-gray-600">{act.location}</td>
                                    <td className="p-4">
                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">{act.soulsWon || 0}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={(e) => handleEditActivity(act, e)}
                                                className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                title="Edit Record"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteActivity(act.id, e)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                title="Delete Record"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        );
    };


    const tabs = [
        { id: 'families', label: 'Families', icon: Users },
        { id: 'evangelism', label: 'Evangelism', icon: HeartHandshake },
        { id: 'vacists', label: 'Vacists Fellowship', icon: GraduationCap },
        { id: 'alumni', label: 'Alumni Fellowship', icon: Building2 }
    ];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text">Campus & Institutions</h1>
                    <p className="text-ministry-muted mt-2">Manage campus fellowships, evangelism, and related activities</p>
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
                        onClick={() => setActiveTab(tab.id as any)}
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
                {activeTab === 'families' && renderActivityTable('Family')}
                {activeTab === 'evangelism' && renderActivityTable('Evangelism')}
                {activeTab === 'vacists' && renderActivityTable('Vacists')}
                {activeTab === 'alumni' && renderActivityTable('Alumni')}
            </div>

            {/* Modals */}
            {isAddingActivity && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-xl font-bold text-ministry-text">New {newActivity.category} Record</h3>
                            <button onClick={() => setIsAddingActivity(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitActivity} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">Date {newActivity.category === 'Family' ? 'of meeting' : newActivity.category === 'Evangelism' ? 'of evangelism' : 'of activity'}</label>
                                    <input type="date" required value={newActivity.date || ''} onChange={e => setNewActivity({ ...newActivity, date: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                                </div>
                                {newActivity.category !== 'Evangelism' && newActivity.category !== 'Alumni' && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-gray-700">{newActivity.category === 'Family' ? 'Name of family' : 'Activity'}</label>
                                        <input required value={newActivity.title || ''} onChange={e => setNewActivity({ ...newActivity, title: e.target.value })} placeholder={`e.g. ${newActivity.category === 'Family' ? 'The Smiths' : 'Outreach'}`} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">{newActivity.category === 'Alumni' ? 'Place' : newActivity.category === 'Evangelism' ? 'Location of evangelism' : 'Location'}</label>
                                <input required value={newActivity.location || ''} onChange={e => setNewActivity({ ...newActivity, location: e.target.value })} placeholder="Location details..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                        <label className="text-sm font-bold text-gray-700">Souls Won ({newSouls.length})</label>
                                        <button type="button" onClick={() => setNewSouls([...newSouls, { name: '', contact: '', residence: '', institution: '' }])} className="text-ministry-orange hover:bg-orange-50 p-1 rounded transition-colors"><Plus size={16} /></button>
                                    </div>
                                    {newSouls.map((soul, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-4 rounded-xl relative mt-2">
                                            <button type="button" onClick={() => setNewSouls(newSouls.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1.5 shadow-sm hover:bg-red-200 transition-colors z-10"><X size={14} /></button>
                                            <input placeholder="Name" value={soul.name} onChange={e => { const s = [...newSouls]; s[idx].name = e.target.value; setNewSouls(s); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full" required />
                                            <div className="w-full">
                                                <PhoneInput
                                                    value={soul.contact}
                                                    onChange={val => { const s = [...newSouls]; s[idx].contact = val; setNewSouls(s); }}
                                                    placeholder="Contact"
                                                    className="w-full text-sm"
                                                />
                                            </div>
                                            <input placeholder="Residence" value={soul.residence} onChange={e => { const s = [...newSouls]; s[idx].residence = e.target.value; setNewSouls(s); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full" />
                                            <input placeholder="Institution" value={soul.institution} onChange={e => { const s = [...newSouls]; s[idx].institution = e.target.value; setNewSouls(s); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full" />
                                        </div>
                                    ))}
                                </div>
                                {newActivity.category !== 'Family' && (
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                            <label className="text-sm font-bold text-gray-700">{newActivity.category === 'Alumni' ? `Alumni Contacts (${newContacts.length})` : `Contacts Collected (${newContacts.length})`}</label>
                                            <button type="button" onClick={() => setNewContacts([...newContacts, { name: '', contact: '', institution: '' }])} className="text-ministry-orange hover:bg-orange-50 p-1 rounded transition-colors"><Plus size={16} /></button>
                                        </div>
                                        {newContacts.map((contact, idx) => (
                                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 p-4 rounded-xl relative mt-2">
                                                <button type="button" onClick={() => setNewContacts(newContacts.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1.5 shadow-sm hover:bg-red-200 transition-colors z-10"><X size={14} /></button>
                                                <input placeholder="Name" value={contact.name} onChange={e => { const c = [...newContacts]; c[idx].name = e.target.value; setNewContacts(c); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full" required />
                                                <div className="w-full">
                                                    <PhoneInput
                                                        value={contact.contact}
                                                        onChange={val => { const c = [...newContacts]; c[idx].contact = val; setNewContacts(c); }}
                                                        placeholder="Contact"
                                                        className="w-full text-sm"
                                                    />
                                                </div>
                                                <input placeholder="Institution" value={contact.institution} onChange={e => { const c = [...newContacts]; c[idx].institution = e.target.value; setNewContacts(c); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full sm:col-span-2" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {newActivity.category === 'Family' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                        <label className="text-sm font-bold text-gray-700">Attendants of the family ({newAttendants.length})</label>
                                        <button type="button" onClick={() => setNewAttendants([...newAttendants, { name: '', contact: '', residence: '', course: '', institution: '' }])} className="text-ministry-orange hover:bg-orange-50 p-1 rounded transition-colors"><Plus size={16} /></button>
                                    </div>
                                    {newAttendants.map((att, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-green-50/50 p-4 rounded-xl relative mt-2">
                                            <button type="button" onClick={() => setNewAttendants(newAttendants.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1.5 shadow-sm hover:bg-red-200 transition-colors z-10"><X size={14} /></button>
                                            <input placeholder="Name" value={att.name} onChange={e => { const a = [...newAttendants]; a[idx].name = e.target.value; setNewAttendants(a); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full" required />
                                            <div className="w-full">
                                                <PhoneInput
                                                    value={att.contact}
                                                    onChange={val => { const a = [...newAttendants]; a[idx].contact = val; setNewAttendants(a); }}
                                                    placeholder="Contact"
                                                    className="w-full text-sm"
                                                />
                                            </div>
                                            <input placeholder="Residence" value={att.residence} onChange={e => { const a = [...newAttendants]; a[idx].residence = e.target.value; setNewAttendants(a); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full" />
                                            <input placeholder="Course" value={att.course} onChange={e => { const a = [...newAttendants]; a[idx].course = e.target.value; setNewAttendants(a); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full" />
                                            <input placeholder="Institution" value={att.institution} onChange={e => { const a = [...newAttendants]; a[idx].institution = e.target.value; setNewAttendants(a); }} className="p-2.5 text-sm border border-gray-200 rounded-lg w-full sm:col-span-2" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {newActivity.category !== 'Family' && (
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">Additional Notes</label>
                                    <textarea value={newActivity.notes || ''} onChange={e => setNewActivity({ ...newActivity, notes: e.target.value })} placeholder="Any specific remarks..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm h-20 resize-none" />
                                </div>
                            )}
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-50">
                                <button type="button" onClick={() => setIsAddingActivity(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-ministry-text text-white font-bold rounded-lg hover:bg-ministry-orange transition-colors flex items-center gap-2">
                                    <Save size={16} /> Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedActivity && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-xl font-bold text-ministry-text">Activity Details</h3>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={(e) => {
                                        setSelectedActivity(null);
                                        handleEditActivity(selectedActivity, e);
                                    }}
                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                    title="Edit Record"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        setSelectedActivity(null);
                                        handleDeleteActivity(selectedActivity.id, e);
                                    }}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Delete Record"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <div className="w-px h-5 bg-gray-200 mx-1"></div>
                                <button onClick={() => setSelectedActivity(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Date</p>
                                    <p className="font-semibold text-gray-900">{new Date(selectedActivity.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">{selectedActivity.category === 'Family' ? 'Name of family' : 'Activity'}</p>
                                    <p className="font-semibold text-gray-900">{selectedActivity.title}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">{selectedActivity.category === 'Alumni' ? 'Place' : selectedActivity.category === 'Evangelism' ? 'Location of evangelism' : 'Location'}</p>
                                    <p className="font-semibold text-gray-900">{selectedActivity.location}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Souls Won</p>
                                    <p className="font-semibold text-gray-900">{selectedActivity.soulsWon}</p>
                                </div>
                            </div>

                            {selectedActivity.notes && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-sm text-gray-500 font-medium mb-3">Notes & Attendees</p>
                                    <div className="bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                                        {/* Gracefully handle legacy JSON format or plain text formatting */}
                                        {(() => {
                                            const lines = selectedActivity.notes!.split('\n');
                                            return lines.map((line, idx) => {
                                                if (!line.trim() || line.trim() === '[' || line.trim() === ']') return null;

                                                // Check for Legacy JSON block start
                                                const jsonKeyword = ['Souls Won:', 'Attendants:', 'Contacts:'].find(k => line.includes(k));
                                                if (jsonKeyword && lines[idx + 1]?.trim() === '[') {
                                                    const extracted = extractJsonArray(selectedActivity.notes!.substring(selectedActivity.notes!.indexOf(line)), jsonKeyword);
                                                    if (extracted) {
                                                        const arr = extracted.data;
                                                        const colors: any = {
                                                            'Souls Won:': 'bg-blue-50 text-blue-700 border-blue-100/50',
                                                            'Attendants:': 'bg-green-50 text-green-700 border-green-100/50',
                                                            'Contacts:': 'bg-orange-50 text-orange-700 border-orange-100/50'
                                                        };
                                                        return (
                                                            <div key={idx} className="mb-4">
                                                                <span className="font-semibold text-ministry-text block mb-2">{jsonKeyword}</span>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {arr.map((s: any, i: number) => (
                                                                        <span key={i} className={`px-3 py-1.5 rounded-lg border flex flex-row items-center space-x-2 ${colors[jsonKeyword]}`}>
                                                                            <span className="font-medium">{s.name}</span>
                                                                            {s.contact && <span className="text-xs opacity-80">{s.contact}</span>}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                }

                                                // Skip rendering parts of the JSON array we already parsed
                                                if (line.trim().startsWith('{') || line.trim().startsWith('}') || line.includes('": "')) return null;

                                                // Standard New Line format
                                                if (line.includes(':')) {
                                                    const [key, ...val] = line.split(':');
                                                    const valueStr = val.join(':').trim();

                                                    // Standard format (comma separated list of names/contacts)
                                                    if (['Souls Won', 'Attendants', 'Contacts'].includes(key.trim()) && valueStr) {
                                                        const items = valueStr.split(',').map(v => v.trim()).filter(v => v);

                                                        // Define pill colors based on category
                                                        let pillClass = "bg-gray-50 text-gray-700 border-gray-100/50";
                                                        if (key.trim() === 'Souls Won') pillClass = "bg-blue-50 text-blue-700 border-blue-100/50";
                                                        if (key.trim() === 'Attendants') pillClass = "bg-green-50 text-green-700 border-green-100/50";
                                                        if (key.trim() === 'Contacts') pillClass = "bg-orange-50 text-orange-700 border-orange-100/50";

                                                        return (
                                                            <div key={idx} className="mb-4">
                                                                <span className="font-semibold text-ministry-text block mb-2">{key}:</span>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {items.map((item, i) => {
                                                                        // Simple extraction if the list is "Name Contact"
                                                                        const parts = item.split(' ');
                                                                        const contactParts = parts.filter(p => p.startsWith('+') || !isNaN(Number(p)));
                                                                        const nameParts = parts.filter(p => !contactParts.includes(p));
                                                                        const name = nameParts.join(' ') || item;
                                                                        const contact = contactParts.join(' ');

                                                                        return (
                                                                            <span key={i} className={`px-3 py-1.5 rounded-lg border flex flex-row items-center space-x-2 ${pillClass}`}>
                                                                                <span className="font-medium">{name}</span>
                                                                                {contact && <span className="text-xs opacity-80">{contact}</span>}
                                                                            </span>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={idx} className="mb-2">
                                                            <span className="font-semibold text-ministry-text">{key}:</span> {valueStr}
                                                        </div>
                                                    )
                                                }

                                                return <p key={idx} className="text-gray-600 mb-1">{line}</p>;
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
