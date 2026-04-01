import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import PhoneInput from './PhoneInput';
import { Child, MinistryEvent, ModalType, User, Soul } from '../types';
import * as XLSX from 'xlsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { validateContact, isServiceClosed } from '../utils';
import { EventStore } from '../database/eventStore';
import { ChildStore, mapChildFromDB } from '../database/childStore';
import { SoulsStore, mapSoulFromDB } from '../database/soulsStore';
import { NextGenSoulsStore, NextGenSoul, mapNextGenSoulFromDB, useNextGenSoulsStore } from '../database/nextGenSoulsStore';
import { supabase } from '../services/supabaseClient';
import ConfirmationModal from './ConfirmationModal';
import {
    Users,
    UserPlus,
    Search,
    Calendar,
    CheckCircle,
    XCircle,
    Baby,
    Clock,
    ArrowLeft,
    Activity,
    LogOut,
    FileText,
    Upload,
    BarChart3,
    CalendarCheck,
    History,
    User as UserIcon,
    Trash2,
    Heart,
    MessageSquare,
    ShieldCheck,
    AlertCircle,
    Download
} from 'lucide-react';

interface NextGenDashboardProps {
    events?: MinistryEvent[];
    onOpenModal?: (type: ModalType) => void;
    currentUser?: User | null;
    // [PHASE E] URL driven tab prop mapped from Layout
    urlTab?: Tab;
}

type Tab = 'checkin' | 'checkout' | 'database' | 'souls';
type ViewMode = 'list' | 'service-active' | 'add-child' | 'bulk-import' | 'child-detail';

const NextGenDashboard: React.FC<NextGenDashboardProps> = ({ events = [], onOpenModal, currentUser, urlTab }) => {
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>(urlTab || 'checkin');
    
    // [PHASE E] Sync local state when URL segment changes
    useEffect(() => {
        if (urlTab && urlTab !== activeTab) {
            setActiveTab(urlTab);
            setViewMode('list');
        }
    }, [urlTab]);
    const [searchParams, setSearchParams] = useSearchParams();
    const urlEventId = searchParams.get('eventId');
    
    const [viewMode, setViewMode] = useState<ViewMode>(urlEventId ? 'service-active' : 'list');
    const [children, setChildren] = useState<Child[]>([]);
    
    // Zustand Hook for Souls
    const { souls: nextGenSouls, fetchSouls: fetchNextGenSouls, subscribe: subscribeNextGenSouls, unsubscribe: unsubscribeNextGenSouls } = useNextGenSoulsStore();
    
    const [searchQuery, setSearchQuery] = useState('');

    const selectedService = events.find(e => e.id === urlEventId) || null;

    const setSelectedService = (service: MinistryEvent | null) => {
        if (service) {
            setSearchParams(prev => {
                prev.set('eventId', service.id);
                return prev;
            });
        } else {
            setSearchParams(prev => {
                prev.delete('eventId');
                return prev;
            });
        }
    };

    // Stats Filter State
    const [activeStatsFilter, setActiveStatsFilter] = useState<'All' | 'CheckIn' | 'CheckedOut' | 'FirstTimer' | 'Souls'>('All');

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'info';
        onConfirm: () => void;
        confirmText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    // Detail View State
    const [selectedChild, setSelectedChild] = useState<Child | null>(null);
    const [isEditingChild, setIsEditingChild] = useState(false);

    // Derived Stats State
    const soulsWonCount = nextGenSouls.filter(s => selectedService && s.serviceId === selectedService.id).length;

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Bulk Selection State
    const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());



    const isRestrictedUser = currentUser?.role === 'Next Gen Member' || currentUser?.role === 'Member';

    const refreshData = async () => {
        const kids = await ChildStore.getAll();
        setChildren(kids);
    };

    // fetch Souls Won is now delegated to the Zustand store.

    const selectedServiceRef = React.useRef(selectedService);
    const isMountedRef = React.useRef(true);

    useEffect(() => {
        selectedServiceRef.current = selectedService;
    }, [selectedService]);

    useEffect(() => {
        refreshData();
        fetchNextGenSouls();
        subscribeNextGenSouls();
        isMountedRef.current = true;

        const channel = supabase.channel('nextgen-live')
            // Children: Granular Updates
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'children' }, (payload) => {
                const newRecord = payload.new as any;
                setChildren(prev => {
                    if (prev.find(c => c.id === newRecord.id)) return prev;
                    return [mapChildFromDB(newRecord), ...prev];
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'children' }, (payload) => {
                const mapped = mapChildFromDB(payload.new);
                setChildren(prev => prev.map(c => c.id === mapped.id ? mapped : c));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'children' }, (payload) => {
                setChildren(prev => prev.filter(c => c.id !== payload.old.id));
            })

            // Ministry Events

            .on('postgres_changes', { event: '*', schema: 'public', table: 'ministry_events' }, () => {
                // Avoiding full page reload.
            })
            .subscribe();

        return () => {
            isMountedRef.current = false;
            supabase.removeChannel(channel);
            unsubscribeNextGenSouls();
        };
    }, []);

    // soulsWonCount derived state effectively replaces the second useEffect here.

    // New Child Form State
    const initialForm = {
        name: '',
        parentName: '',
        parentContact: '', // numbers only, max 12 digits
        age: '',
        gender: 'Male',
        category: 'First Timer',
        residence: '',
        salvationDate: '',
        howHeard: ''
    };
    const [formData, setFormData] = useState(initialForm);
    const [bulkText, setBulkText] = useState('');
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState<'Observation' | 'Prayer' | 'Incident'>('Observation');

    const filteredChildren = (children || []).filter(c => {
        const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

        let matchesSearch = true;
        if (tokens.length > 0) {
            const childName = (c.name || '').toLowerCase();
            const parentName = (c.parentName || '').toLowerCase();

            // Normalize contact
            const contactRaw = c.parentContact || '';
            const contactClean = contactRaw.replace(/\D/g, '');

            matchesSearch = tokens.every(token => {
                if (childName.includes(token) || parentName.includes(token)) return true;

                const tokenClean = token.replace(/\D/g, '');
                if (tokenClean.length > 0 && contactClean.includes(tokenClean)) return true;

                return false;
            });
        }

        // If in checkout mode (Active Service View)
        if (viewMode === 'service-active' && selectedService) {
            const isAttended = c.attendedServiceIds.includes(selectedService.id);

            // Filter by active stat card
            if (activeStatsFilter === 'CheckIn') {
                return matchesSearch && isAttended && c.status === 'Checked In';
            }
            if (activeStatsFilter === 'CheckedOut') {
                return matchesSearch && isAttended && c.status === 'Checked Out';
            }
            if (activeStatsFilter === 'FirstTimer') {
                // First timers who attended filtering
                return matchesSearch && isAttended && (c.category === 'First Timer' || (c.joinedDate && c.joinedDate.slice(0, 10) === selectedService.date.slice(0, 10)));
            }

            // If 'All' or no specific filter, allow searching everyone (for check-in)
            // But if we are in 'checkin' tab, we might want to prioritize showing attendees?
            // User requested that clicking the card shows only the relevant kids.
            // If 'All' is selected, we probably want to see everyone (to add new check-ins).
            return matchesSearch;
        }

        return matchesSearch;
    });

    const services = events.filter(e => e.type === 'Service').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- Handlers ---

    // Selection Handlers
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Select all currently visible (or all? usually all visible)
            // Let's select all in the database view (all filtered children)
            const allIds = new Set(filteredChildren.map(c => c.id));
            setSelectedChildIds(allIds);
        } else {
            setSelectedChildIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedChildIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedChildIds(newSet);
    };

    const handleDeleteSelected = async () => {
        if (selectedChildIds.size === 0) return;

        if (window.confirm(`Are you sure you want to delete ${selectedChildIds.size} ${selectedChildIds.size === 1 ? 'child' : 'children'}? This action cannot be undone.`)) {
            const idsToDelete = Array.from(selectedChildIds) as string[];
            try {
                await ChildStore.bulkDelete(idsToDelete);
                setChildren(prev => prev.filter(c => !selectedChildIds.has(c.id)));
                setSelectedChildIds(new Set());
                showToast(`Successfully deleted ${idsToDelete.length} ${idsToDelete.length === 1 ? 'child' : 'children'}.`, 'success');
            } catch (error) {
                console.error("Bulk delete failed", error);
                showToast("Failed to delete children.", 'error');
            }
        }
    };

    const handleOpenService = (service: MinistryEvent) => {
        setSelectedService(service);
        setViewMode('service-active');
    };

    const handleBack = () => {
        if (viewMode === 'add-child' && selectedService) {
            setViewMode('service-active');
            setFormData(initialForm);
            return;
        }

        setViewMode('list');
        setSelectedService(null);
        setSearchQuery('');
        setFormData(initialForm);
        setBulkText('');
        setSelectedChild(null);
        setIsEditingChild(false);
    };

    const handleCheckIn = async (childId: string) => {
        if (!selectedService) return;

        const child = children.find(c => c.id === childId);
        if (!child) return;

        // AUTO-PROMOTE Logic (Frontend Mirror):
        // If checking in a First Timer, they become a Member immediately.
        const newCategory = child.category === 'First Timer' ? 'Member' : child.category;

        const updatedChild: Child = {
            ...child,
            status: 'Checked In',
            checkInTime: new Date().toISOString(),
            checkOutTime: undefined,
            attendedServiceIds: [...child.attendedServiceIds, selectedService.id],
            category: newCategory
        };

        // Optimistic UI update
        setChildren(prev => prev.map(c => c.id === childId ? updatedChild : c));

        // DB Update
        await ChildStore.update(updatedChild);
    };

    const handleCheckOut = async (childId: string) => {
        if (!selectedService) return;

        const child = children.find(c => c.id === childId);
        if (!child) return;

        const updatedChild: Child = {
            ...child,
            status: 'Checked Out',
            checkOutTime: new Date().toISOString()
        };

        // Optimistic UI update
        setChildren(prev => prev.map(c => c.id === childId ? updatedChild : c));

        // DB Update
        await ChildStore.update(updatedChild);
    };

    const handleAddNextGenSoul = async (child: Child) => {
        if (!selectedService) return;

        setConfirmModal({
            isOpen: true,
            title: 'Record Soul Won',
            message: `Do you want to record ${child.name} as a Soul Won for the service "${selectedService.title}"?`,
            type: 'info',
            confirmText: 'Yes, Record Soul',
            onConfirm: async () => {
                try {
                    const newSoul = {
                        firstName: child.name.split(' ')[0],
                        lastName: child.name.split(' ').slice(1).join(' ') || '.',
                        phone: child.parentContact,
                        age: child.age,
                        gender: child.gender,
                        residence: child.residence,
                        serviceId: selectedService.id,
                        status: 'New',
                        capturedBy: currentUser?.name || 'Next Gen',
                        notes: `Parent: ${child.parentName}`
                    };

                    await NextGenSoulsStore.add(newSoul);

                    refreshData();
                    showToast(`${child.name} recorded as a soul!`, 'success');
                } catch (e: any) {
                    console.error("Failed to add soul - Full Error:", e);
                    showToast(`Failed to record soul. ${e.message || e.error_description || ''}`, 'error');
                }
            }
        });
    };

    const handleDeleteNextGenSoul = async (soulId: string) => {
        if (!window.confirm('Are you sure you want to delete this soul check-in? This action cannot be undone.')) return;

        try {
            await NextGenSoulsStore.delete(soulId);
            showToast('Soul record deleted.', 'success');
        } catch (e) {
            console.error('Delete failed', e);
            showToast('Failed to delete soul record.', 'error');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'parentContact') {
            setFormData({ ...formData, [name]: validateContact(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleAddChild = async (e: React.FormEvent) => {
        e.preventDefault();
        const isServiceActive = !!selectedService;

        const newChild: Child = {
            id: crypto.randomUUID(),
            name: formData.name,
            parentName: formData.parentName,
            parentContact: formData.parentContact,
            age: parseInt(formData.age) || 0,
            gender: formData.gender as 'Male' | 'Female',
            category: 'First Timer',
            residence: formData.residence,
            status: isServiceActive ? 'Checked In' : 'Absent',
            checkInTime: isServiceActive ? new Date().toISOString() : undefined,
            joinedDate: new Date().toISOString().split('T')[0],
            attendedServiceIds: isServiceActive && selectedService ? [selectedService.id] : [],
            currentServiceId: isServiceActive && selectedService ? selectedService.id : undefined,
            howHeard: (formData as any).howHeard
        };

        try {
            await ChildStore.add(newChild);

            setChildren([newChild, ...children]);
            setFormData(initialForm);

            if (isServiceActive) {
                showToast(`${newChild.name} registered and checked in successfully!`, 'success');
            } else {
                showToast(`${newChild.name} added to Next Gen database.`, 'success');
                setViewMode('list');
            }
        } catch (error: any) {
            console.error('Failed to add child:', error);
            showToast(`Failed to register child: ${error.message || 'Unknown error'}`, 'error');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            // Convert to tab-separated string
            // Order: Child Name, Gender, Age, Residence, Parent Name, Contact
            let text = '';
            jsonData.forEach((row, index) => {
                // Skip header if detected 
                if (index === 0 && typeof row[0] === 'string' && row[0].toLowerCase().includes('name')) return;

                const name = row[0] || '';
                const gender = row[1] || 'Male';
                const age = row[2] || '';
                const residence = row[3] || '';
                const parentName = row[4] || '';
                const parentContact = row[5] || '';

                if (name) {
                    text += `${name}\t${gender}\t${age}\t${residence}\t${parentName}\t${parentContact}\n`;
                }
            });
            setBulkText(text);
        } else {
            // Fallback for CSV/Text
            const reader = new FileReader();
            reader.onload = (evt) => {
                const text = evt.target?.result as string;
                setBulkText(text);
            };
            reader.readAsText(file);
        }
    };



    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const lines = bulkText.split('\n');
        const newChildren: Child[] = [];
        let count = 0;

        lines.forEach(line => {
            if (!line.trim()) return;

            // Support Excel (Tab) or CSV (Comma)
            const delimiter = line.includes('\t') ? '\t' : ',';
            const parts = line.split(delimiter);

            // Expected Format: Name, Gender, Age, Residence, Parent Name, Parent Contact
            if (parts.length >= 6) {
                const name = parts[0].trim();
                const gender = parts[1].trim();
                const age = parseInt(parts[2].trim()) || 0;
                const residence = parts[3].trim();
                const parentName = parts[4].trim();
                const parentContact = validateContact(parts[5].trim());

                if (name && parentName) {
                    newChildren.push({
                        id: crypto.randomUUID(),
                        name,
                        age,
                        gender: gender.toLowerCase().startsWith('f') ? 'Female' : 'Male',
                        parentName,
                        parentContact,
                        residence,
                        status: 'Absent',
                        joinedDate: new Date().toISOString().split('T')[0],
                        attendedServiceIds: []
                    });
                    count++;
                }
            }
        });

        if (count > 0) {
            await ChildStore.bulkAdd(newChildren);
            setChildren([...newChildren, ...children]);
            setBulkText('');
            setViewMode('list');
            showToast(`${count} children profiles imported successfully.`, 'success');
        } else {
            showToast("No valid data found. Ensure format matches instructions.", 'error');
        }
    };

    const handleExportToExcel = () => {
        if (!children || children.length === 0) {
            showToast("No children records available to export.", "error");
            return;
        }

        const exportData = children.map(child => {
            let rank = 'Nursery (<2)';
            if (child.age > 12) rank = 'General (>12)';
            else if (child.age > 9) rank = 'Captain (10-12)';
            else if (child.age > 6) rank = 'Lieutenant (7-9)';
            else if (child.age >= 2) rank = 'Sergeant (2-6)';

            return {
                "Child Name": child.name,
                "Rank": rank,
                "Age": child.age,
                "Gender": child.gender,
                "Parent Name": child.parentName,
                "Parent Contact": child.parentContact,
                "Residence": child.residence,
                "Joined Date": child.joinedDate,
                "How Heard": child.howHeard || '',
                "Salvation Date": child.salvationDate || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Children Database");

        XLSX.writeFile(workbook, `NextGen_Children_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast("Database exported to Excel.", "success");
    };

    // --- Render ---

    // Pagination Logic
    const paginatedChildren = filteredChildren.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleViewChild = (child: Child) => {
        setSelectedChild(child);
        // Pre-fill form for editing
        setFormData({
            name: child.name,
            parentName: child.parentName,
            parentContact: child.parentContact,
            age: String(child.age),
            gender: child.gender,
            category: child.category || 'Member',
            residence: child.residence,
            salvationDate: child.salvationDate || ''
        });
        setIsEditingChild(false);
        setViewMode('child-detail');
    };

    const handleUpdateChild = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChild) return;

        try {
            const updatedChild: Child = {
                ...selectedChild,
                name: formData.name,
                parentName: formData.parentName,
                parentContact: formData.parentContact,
                age: parseInt(formData.age) || 0,
                gender: formData.gender as 'Male' | 'Female',
                category: formData.category,
                residence: formData.residence
            };

            await ChildStore.update(updatedChild);

            // Update local state
            setChildren(prev => prev.map(c => c.id === updatedChild.id ? updatedChild : c));
            setSelectedChild(updatedChild);
            setIsEditingChild(false);
            showToast("Child profile updated successfully.", 'success');
        } catch (error) {
            console.error("Update failed", error);
            showToast("Failed to update child profile.", 'error');
        }
    };

    const handleAddCareNote = async () => {
        if (!selectedChild || !newNote.trim()) return;

        try {
            const noteObj = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                author: currentUser?.name || 'Staff',
                note: newNote,
                type: noteType
            };

            const updatedChild = {
                ...selectedChild,
                careNotes: [noteObj, ...(selectedChild.careNotes || [])]
            };

            await ChildStore.update(updatedChild);
            setChildren(prev => prev.map(c => c.id === updatedChild.id ? updatedChild : c));
            setSelectedChild(updatedChild);
            setNewNote('');
            showToast("Care note added.", 'success');
        } catch (e) {
            showToast("Failed to add note.", 'error');
        }
    };


    const handleDeleteChild = async (childId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        setConfirmModal({
            isOpen: true,
            title: 'Delete Child Profile',
            message: 'Are you sure you want to delete this child from the database? This action cannot be undone and will remove all their check-in history.',
            type: 'danger',
            confirmText: 'Delete Forever',
            onConfirm: async () => {
                try {
                    await ChildStore.delete(childId);
                    setChildren(prev => prev.filter(c => c.id !== childId));
                    if (viewMode === 'child-detail') {
                        handleBack();
                    }
                    showToast('Child deleted successfully', 'success');
                } catch (error) {
                    console.error("Delete failed", error);
                    showToast("Failed to delete child", 'error');
                }
            }
        });
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
            />

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <Baby className="w-8 h-8 text-ministry-orange" />
                        Next Gen Ministry
                    </h1>
                    <p className="text-gray-500">Manage children, parents, and service check-ins.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            {(viewMode === 'list' || viewMode === 'child-detail') && (
                <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => { setActiveTab('checkin'); setViewMode('list'); navigate('/next-gen/checkin'); }}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'checkin'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <CheckCircle className={`w-4 h-4 ${activeTab === 'checkin' ? 'text-ministry-neon' : ''}`} />
                        <span>Check-In</span>
                    </button>


                    {!isRestrictedUser && (
                        <button
                            onClick={() => { setActiveTab('souls'); setViewMode('list'); navigate('/next-gen/souls'); }}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'souls'
                                ? 'bg-black text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <Heart className={`w-4 h-4 ${activeTab === 'souls' ? 'text-ministry-neon' : ''}`} />
                            <span>Souls DB</span>
                        </button>
                    )}
                    {!isRestrictedUser && (
                        <button
                            onClick={() => { setActiveTab('database'); setViewMode('list'); navigate('/next-gen/database'); }}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'database'
                                ? 'bg-black text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <Users className={`w-4 h-4 ${activeTab === 'database' ? 'text-ministry-neon' : ''}`} />
                            <span>Children DB</span>
                        </button>
                    )}
                </div>
            )}

            {/* Content Area */}
            <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">

                {/* --- SERVICE LIST (Shared for Check-In and Check-Out) --- */}
                {(activeTab === 'checkin' || activeTab === 'checkout') && viewMode === 'list' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">
                                {activeTab === 'checkin' ? 'Select Service for Check-In' : 'Select Service for Check-Out'}
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {services.map(service => {
                                const serviceDate = new Date(service.date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                serviceDate.setHours(0, 0, 0, 0);
                                const isPast = serviceDate < today;

                                return (
                                    <div key={service.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/40 hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                                {isPast ? 'Past Service' : 'Active / Upcoming'}
                                            </span>
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <h4 className="text-lg font-bold text-ministry-text mb-1">{service.title}</h4>
                                        <p className="text-sm text-gray-500 mb-4 flex items-center">
                                            <Clock className="w-3 h-3 mr-1" /> {service.date} at {service.time}
                                        </p>
                                        {isServiceClosed(service.date) ? (
                                            <button
                                                onClick={() => handleOpenService(service)}
                                                className="w-full text-gray-600 bg-gray-100 py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors hover:bg-gray-200"
                                            >
                                                <Activity className="w-4 h-4 mr-2" /> View Highlights
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenService(service)}
                                                className={`w-full text-white py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors ${activeTab === 'checkout' ? 'bg-gray-800 hover:bg-gray-900' : 'bg-ministry-text hover:bg-ministry-orange'}`}
                                            >
                                                {activeTab === 'checkout' ? (
                                                    <><LogOut className="w-4 h-4 mr-2" /> Manage Check-Out</>
                                                ) : (
                                                    <><CheckCircle className="w-4 h-4 mr-2" /> Manage Check-In</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}





                {/* --- SOULS DATABASE TAB --- */}
                {activeTab === 'souls' && viewMode === 'list' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Next Gen Souls Database</h3>
                            <button onClick={() => refreshData()} className="text-sm text-ministry-orange hover:underline">Refresh</button>
                        </div>

                        {/* Mobile View (Cards) */}
                        <div className="md:hidden space-y-4">
                            {nextGenSouls.map(soul => (
                                <div key={soul.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{soul.firstName} {soul.lastName}</h4>
                                            <p className="text-xs text-gray-500 font-mono">{soul.phone}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${soul.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {soul.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-3">
                                        <span className="font-bold">Service:</span> {services.find(s => s.id === soul.serviceId)?.title || 'Unknown'}
                                    </p>
                                    <div className="flex justify-end pt-2 border-t border-gray-100">
                                        <button
                                            onClick={() => handleDeleteNextGenSoul(soul.id)}
                                            className="text-red-600 text-xs font-bold flex items-center hover:bg-red-50 px-2 py-1 rounded"
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" /> Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {nextGenSouls.length === 0 && (
                                <div className="p-8 text-center text-gray-400 italic">No souls recorded yet.</div>
                            )}
                        </div>

                        {/* Desktop View (Table) */}
                        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[600px]">
                                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Phone</th>
                                        <th className="px-6 py-3">Source Service</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {nextGenSouls.map(soul => (
                                        <tr key={soul.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-bold text-gray-900">{soul.firstName} {soul.lastName}</td>
                                            <td className="px-6 py-3 text-gray-600 font-mono">{soul.phone}</td>
                                            <td className="px-6 py-3 text-gray-600">
                                                {services.find(s => s.id === soul.serviceId)?.title || 'Unknown Service'}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${soul.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                    {soul.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteNextGenSoul(soul.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {nextGenSouls.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                                No souls recorded in Next Gen database yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- CHILDREN DATABASE TAB (Existing) --- */}
                {activeTab === 'database' && viewMode === 'list' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-lg font-bold text-gray-800">Children's Database</h3>
                            <div className="flex space-x-3 w-full md:w-auto">
                                <button
                                    onClick={handleExportToExcel}
                                    className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden md:inline">Export Excel</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('add-child')}
                                    className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Add Child</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('bulk-import')}
                                    className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>Bulk Import</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative group max-w-lg flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                                    placeholder="Search by Child, Parent, or Contact..."
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            {selectedChildIds.size > 0 && (
                                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg animate-in fade-in">
                                    <span className="text-sm font-bold text-gray-700">{selectedChildIds.size} Selected</span>
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm font-bold bg-white px-3 py-1 rounded shadow-sm border border-red-100 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* PAGINATION CONTROLS */}
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-10">
                            <div>
                                <span className="text-sm text-gray-600">Showing </span>
                                <span className="font-bold text-gray-900">
                                    {filteredChildren.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredChildren.length)}
                                </span>
                                <span className="text-sm text-gray-600"> of {filteredChildren.length} children</span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={currentPage * itemsPerPage >= filteredChildren.length}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                        {/* Mobile View (Cards) */}
                        <div className="md:hidden space-y-4">
                            {paginatedChildren.length > 0 ? paginatedChildren.map(c => (
                                <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                                    {/* Selection Checkbox Absolute */}
                                    <div className="absolute top-4 right-4">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 w-5 h-5 text-ministry-orange focus:ring-ministry-orange"
                                            checked={selectedChildIds.has(c.id)}
                                            onChange={() => handleSelectOne(c.id)}
                                        />
                                    </div>

                                    <div className="pr-8">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-gray-900 text-lg">{c.name}</h4>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.category === 'First Timer' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {c.category || 'Member'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 mb-2">
                                            {c.age} yrs • {c.gender}
                                        </div>

                                        <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-500 mb-3">
                                            <div className="flex items-center gap-1 mb-1">
                                                <UserIcon size={12} /> {c.parentName}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <PhoneInput value={c.parentContact} onChange={() => { }} className="bg-transparent border-none p-0 h-auto text-xs" />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'Checked In' ? 'bg-green-100 text-green-700' :
                                                c.status === 'Checked Out' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                {c.status}
                                            </span>
                                            <button
                                                onClick={() => handleViewChild(c)}
                                                className="text-ministry-blue font-bold text-sm hover:underline bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                                            >
                                                View Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-gray-500 italic">No records found.</div>
                            )}
                        </div>

                        {/* Desktop View (Table) */}
                        <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-ministry-orange focus:ring-ministry-orange"
                                                checked={filteredChildren.length > 0 && selectedChildIds.size === filteredChildren.length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-4">Child Name</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Age / Gender</th>
                                        <th className="px-6 py-4">Parent</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {paginatedChildren.length > 0 ? paginatedChildren.map(c => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-ministry-orange focus:ring-ministry-orange"
                                                    checked={selectedChildIds.has(c.id)}
                                                    onChange={() => handleSelectOne(c.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.category === 'First Timer' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {c.category || 'Member'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{c.age} yrs • {c.gender}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{c.parentName}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-gray-500">{c.parentContact}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'Checked In' ? 'bg-green-100 text-green-700' :
                                                    c.status === 'Checked Out' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewChild(c)}
                                                        className="text-ministry-blue font-bold text-xs hover:underline bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={7} className="p-8 text-center text-gray-500">No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}




                {/* --- ACTIVE SERVICE CHECK-IN/OUT VIEW (Original) --- */}
                {viewMode === 'service-active' && (activeTab === 'checkin' || activeTab === 'checkout') && selectedService && (
                    <div className="space-y-6">


                        {/* --- SERVICE VIEW (ACTIVE) --- */}
                        {isServiceClosed(selectedService.date) ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                                        </button>
                                        <div>
                                            <h2 className="text-xl font-bold text-ministry-text">{selectedService.title}</h2>
                                            <p className="text-sm text-gray-500">
                                                Service Highlights • {selectedService.date}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm">
                                        Read Only
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                                    {/* Card 1: TOTAL CHECK-INS (Dark) */}
                                    <div className="bg-ministry-text border-l-4 border-ministry-neon p-6 rounded-xl shadow-sm text-center">
                                        <h4 className="text-white font-bold uppercase text-xs mb-2">Total Check-Ins</h4>
                                        <p className="text-4xl font-black text-white">
                                            {children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId)))).length}
                                        </p>
                                    </div>

                                    {/* Card 2: FIRST TIMERS (White with Orange Border) */}
                                    <div className="bg-white border-2 border-ministry-orange p-6 rounded-xl shadow-sm text-center">
                                        <h4 className="text-ministry-text font-bold uppercase text-xs mb-2">First Timers</h4>
                                        <p className="text-4xl font-black text-gray-800">
                                            {children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && (c.category === 'First Timer' || (c.joinedDate && c.joinedDate.slice(0, 10) === selectedService.date.slice(0, 10)))).length}
                                        </p>
                                    </div>

                                    {/* Card 3: SOULS WON (Dark with Orange Text) */}
                                    <div className="bg-ministry-text p-6 rounded-xl shadow-sm text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <UserPlus className="w-24 h-24 text-ministry-orange" />
                                        </div>
                                        <h4 className="text-ministry-orange font-bold uppercase text-xs mb-2">Souls Won</h4>
                                        <p className="text-4xl font-black text-ministry-orange">
                                            {nextGenSouls.filter(s => (s.serviceId === selectedService.id || !!(selectedService.legacyId && s.serviceId === selectedService.legacyId))).length}
                                        </p>
                                    </div>

                                    {/* Card 4: CHECKED OUT (White with Gray Border) */}
                                    <div className="bg-white border border-gray-300 p-6 rounded-xl shadow-sm text-center">
                                        <h4 className="text-gray-500 font-bold uppercase text-xs mb-2">Checked Out</h4>
                                        <p className="text-4xl font-black text-gray-700">
                                            {children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.status === 'Checked Out').length}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl text-center text-blue-800 text-sm">
                                    This service is closed. You can only view high-level stats and list of attendees.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                                        </button>
                                        <div>
                                            <h2 className="text-xl font-bold text-ministry-text">{selectedService.title}</h2>
                                            <p className="text-sm text-gray-500">
                                                {activeTab === 'checkout' ? 'Kids Check-Out' : 'Kids Check-In'} • {selectedService.date}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Hide Register button in Check-Out mode */}
                                    <div className="flex space-x-2">
                                        {activeTab === 'checkin' && (
                                            <>

                                                <button
                                                    onClick={() => setViewMode('add-child')}
                                                    className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 shadow-md"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    <span className="hidden md:inline">Register New</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Stats Grid for Active Service */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                                    {/* Card 1: TOTAL CHECK-INS */}
                                    <button
                                        onClick={() => setActiveStatsFilter(prev => prev === 'CheckIn' ? 'All' : 'CheckIn')}
                                        className={`p-6 rounded-xl shadow-sm text-center transition-all ${activeStatsFilter === 'CheckIn' ? 'bg-ministry-text border-l-4 border-ministry-neon ring-2 ring-ministry-text ring-offset-2' : 'bg-gray-800 border-l-4 border-ministry-neon hover:bg-gray-700'}`}
                                    >
                                        <h4 className="text-white font-bold uppercase text-xs mb-2">Total Check-Ins</h4>
                                        <p className="text-4xl font-black text-white">
                                            {children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId)))).length}
                                        </p>
                                    </button>

                                    {/* Card 2: CHECKED OUT */}
                                    <button
                                        onClick={() => setActiveStatsFilter(prev => prev === 'CheckedOut' ? 'All' : 'CheckedOut')}
                                        className={`p-6 rounded-xl shadow-sm text-center transition-all ${activeStatsFilter === 'CheckedOut' ? 'bg-gray-100 border-2 border-gray-400 ring-2 ring-gray-400 ring-offset-2' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <h4 className="text-gray-500 font-bold uppercase text-xs mb-2">Checked Out</h4>
                                        <p className="text-4xl font-black text-gray-700">
                                            {children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.status === 'Checked Out').length}
                                        </p>
                                    </button>

                                    {/* Card 3: FIRST TIMERS */}
                                    <button
                                        onClick={() => setActiveStatsFilter(prev => prev === 'FirstTimer' ? 'All' : 'FirstTimer')}
                                        className={`p-6 rounded-xl shadow-sm text-center transition-all ${activeStatsFilter === 'FirstTimer' ? 'bg-orange-50 border-2 border-ministry-orange ring-2 ring-ministry-orange ring-offset-2' : 'bg-white border-2 border-ministry-orange hover:bg-orange-50/50'}`}
                                    >
                                        <h4 className="text-ministry-text font-bold uppercase text-xs mb-2">First Timers</h4>
                                        <p className="text-4xl font-black text-gray-800">
                                            {children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && (c.category === 'First Timer' || (c.joinedDate && c.joinedDate.slice(0, 10) === selectedService.date.slice(0, 10)))).length}
                                        </p>
                                    </button>

                                    {/* Card 4: SOULS WON */}
                                    <button
                                        onClick={() => setActiveStatsFilter('Souls')}
                                        className={`p-6 rounded-xl shadow-sm text-center relative overflow-hidden transition-all ${activeStatsFilter === 'Souls' ? 'bg-ministry-text ring-2 ring-ministry-orange ring-offset-2' : 'bg-ministry-text hover:bg-gray-900'}`}
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <UserPlus className="w-24 h-24 text-ministry-orange" />
                                        </div>
                                        <h4 className="text-ministry-orange font-bold uppercase text-xs mb-2">Souls Won</h4>
                                        <p className="text-4xl font-black text-ministry-orange">
                                            {nextGenSouls.filter(s => (s.serviceId === selectedService.id || !!(selectedService.legacyId && s.serviceId === selectedService.legacyId))).length}
                                        </p>
                                    </button>
                                </div>

                                {/* --- Demographics & Safety Section --- */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Safety Flag */}
                                    <div className={`p-6 rounded-xl border-l-4 shadow-sm ${(children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.status === 'Checked In').length) > 0
                                        ? 'bg-yellow-50 border-yellow-500 text-yellow-800' // Warning if kids still checked in
                                        : 'bg-green-50 border-green-500 text-green-800' // All clear
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-bold uppercase text-xs opacity-70">Safety Flag</h4>
                                            {(children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.status === 'Checked In').length) > 0 ? <AlertCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                                        </div>
                                        <p className="text-3xl font-black">
                                            {children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.status === 'Checked In').length}
                                        </p>
                                        <p className="text-xs font-bold mt-1">Children currently checked in</p>
                                    </div>

                                    {/* Rank Breakdown */}
                                    <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                        <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                                            <BarChart3 className="w-4 h-4 mr-2 text-ministry-orange" />
                                            Attendance by Rank
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: 'General (>12)', count: children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.age > 12).length, color: 'bg-purple-100 text-purple-700' },
                                                { label: 'Captain (10-12)', count: children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.age > 9 && c.age <= 12).length, color: 'bg-blue-100 text-blue-700' },
                                                { label: 'Lieutenant (7-9)', count: children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.age > 6 && c.age <= 9).length, color: 'bg-green-100 text-green-700' },
                                                { label: 'Sergeant (2-6)', count: children.filter(c => (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.age >= 2 && c.age <= 6).length, color: 'bg-orange-100 text-orange-700' }
                                            ].map(rank => (
                                                <div key={rank.label} className={`${rank.color} p-3 rounded-lg text-center`}>
                                                    <div className="text-2xl font-black">{rank.count}</div>
                                                    <div className="text-[10px] font-bold uppercase opacity-80">{rank.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {activeStatsFilter === 'Souls' ? (
                                    <div className="space-y-4 animate-in fade-in">
                                        <div className="bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                            <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                                                Showing {nextGenSouls.filter(s => (s.serviceId === selectedService.id || !!(selectedService.legacyId && s.serviceId === selectedService.legacyId))).length} Souls Won
                                            </div>
                                            {nextGenSouls.filter(s => (s.serviceId === selectedService.id || !!(selectedService.legacyId && s.serviceId === selectedService.legacyId))).map(soul => (
                                                <div key={soul.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-gray-900 truncate">{soul.firstName} {soul.lastName}</p>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${soul.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                                {soul.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate">{soul.phone} • Captured By: {soul.capturedBy}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {nextGenSouls.filter(s => (s.serviceId === selectedService.id || !!(selectedService.legacyId && s.serviceId === selectedService.legacyId))).length === 0 && (
                                                <div className="p-4 text-center text-gray-500">
                                                    No souls recorded for this service yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-w-xl mx-auto space-y-4">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ministry-orange" />
                                            <input
                                                className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                                                placeholder={activeTab === 'checkout' ? "Search Checked-In Children..." : "Search Child, Parent..."}
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                        </div>

                                        <div className="bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                            <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                                                Showing {filteredChildren.length} {activeStatsFilter === 'FirstTimer' ? 'First Timers' : activeStatsFilter === 'CheckedOut' ? 'Checked Out Children' : activeStatsFilter === 'CheckIn' ? 'Checked In Children' : 'Children'}
                                            </div>
                                            {filteredChildren.map(c => (
                                                <div key={c.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-gray-900 truncate">{c.name}</p>
                                                            {(c.status === 'Checked In' || (selectedService && (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))))) && (
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.status === 'Checked Out' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                                                    {c.status === 'Checked Out' ? 'Checked Out' : 'Checked In'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 mb-1">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                                                Cat: {c.category || 'Missing'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate">{c.age} yrs • Parent: {c.parentName} ({c.parentContact})</p>
                                                    </div>
                                                    <div>
                                                        {(c.status === 'Checked In' || (selectedService && (c.attendedServiceIds.includes(selectedService.id) || !!(selectedService.legacyId && c.attendedServiceIds.includes(selectedService.legacyId))) && c.status !== 'Checked Out')) ? (
                                                            <div className="flex items-center space-x-3">
                                                                <button
                                                                    onClick={() => handleCheckOut(c.id)}
                                                                    className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-gray-300 shadow-sm"
                                                                >
                                                                    <LogOut className="w-3 h-3" />
                                                                    <span>Check Out</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Check In Action for CheckIn Tab */}
                                                                {activeTab === 'checkin' && (
                                                                    <button
                                                                        onClick={() => handleCheckIn(c.id)}
                                                                        className="bg-ministry-text text-white px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-black transition-colors shadow-sm flex items-center"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3 mr-1.5" />
                                                                        Check In
                                                                    </button>
                                                                )}
                                                                {/* If in Checkout tab but child not checked in */}
                                                                {activeTab === 'checkout' && (
                                                                    <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded">Not Checked In</span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {filteredChildren.length === 0 && (
                                            <div className="p-4 text-center text-gray-500">
                                                {activeTab === 'checkout'
                                                    ? "No checked-in children found matching search."
                                                    : (
                                                        <>
                                                            No child found. <button onClick={() => setViewMode('add-child')} className="text-ministry-orange font-bold hover:underline">Register New?</button>
                                                        </>
                                                    )
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- CHILD DETAIL VIEW --- */}
                {viewMode === 'child-detail' && selectedChild && (() => {
                    // Calculate Stats
                    // Filter services since joined date (safely handle dates)
                    const joinedDate = new Date(selectedChild.joinedDate);
                    const relevantServices = services.filter(s => {
                        const sDate = new Date(s.date);
                        // Check valid date and if service corresponds to post-joining (ignoring exact time)
                        return !isNaN(sDate.getTime()) && sDate >= joinedDate;
                    });

                    const totalServicesSince = relevantServices.length || 1; // Avoid divide by zero
                    const attendedCount = selectedChild.attendedServiceIds.length;
                    const attendanceScore = Math.min(100, Math.round((attendedCount / totalServicesSince) * 100));

                    // Map History
                    const history = selectedChild.attendedServiceIds
                        .map(id => services.find(s => s.id === id))
                        .filter((s): s is MinistryEvent => !!s)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    return (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <button onClick={handleBack} className="flex items-center space-x-2 text-gray-500 hover:text-gray-800 transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                    <span className="font-bold">Back to Database</span>
                                </button>
                            </div>

                            {/* Top Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-full"><Users className="w-8 h-8 text-blue-600" /></div>
                                    <div>
                                        <p className="text-xs uppercase font-bold text-gray-400">Total Attended</p>
                                        <p className="text-2xl font-black text-gray-900">{attendedCount} Services</p>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                                    <div className="p-3 bg-purple-50 rounded-full"><CalendarCheck className="w-8 h-8 text-purple-600" /></div>
                                    <div>
                                        <p className="text-xs uppercase font-bold text-gray-400">Total Services Held</p>
                                        <p className="text-2xl font-black text-gray-900">{totalServicesSince} Held</p>
                                        <p className="text-xs text-gray-500">Since Joined ({selectedChild.joinedDate})</p>
                                    </div>
                                </div>
                                <div className="bg-ministry-text text-white p-6 rounded-2xl shadow-lg border-l-4 border-ministry-neon flex items-center gap-4">
                                    <div className="p-3 bg-white/10 rounded-full"><BarChart3 className="w-8 h-8 text-white" /></div>
                                    <div>
                                        <p className="text-xs uppercase font-bold text-gray-400">Attendance Score</p>
                                        <p className="text-3xl font-black">{attendanceScore}%</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* LEFT: Profile Details */}
                                <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                            <UserIcon className="w-5 h-5" /> Child Profile
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDeleteChild(selectedChild.id)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" /> Delete
                                            </button>
                                            <button
                                                onClick={() => setIsEditingChild(!isEditingChild)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isEditingChild ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}
                                            >
                                                {isEditingChild ? 'Cancel Editing' : 'Edit Details'}
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleUpdateChild} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500">Child Name</label>
                                                <input disabled={!isEditingChild} value={formData.name} onChange={handleInputChange} name="name" className={`w-full p-2 border rounded-lg ${!isEditingChild ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500">Gender</label>
                                                <select disabled={!isEditingChild} value={formData.gender} onChange={handleInputChange} name="gender" className={`w-full p-2 border rounded-lg ${!isEditingChild ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`}>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500">Category</label>
                                                <select disabled={!isEditingChild} value={formData.category} onChange={handleInputChange} name="category" className={`w-full p-2 border rounded-lg ${!isEditingChild ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`}>
                                                    <option value="Member">Member</option>
                                                    <option value="First Timer">First Timer</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500">Age</label>
                                                <input type="number" disabled={!isEditingChild} value={formData.age} onChange={handleInputChange} name="age" className={`w-full p-2 border rounded-lg ${!isEditingChild ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500">Residence</label>
                                                <input disabled={!isEditingChild} value={formData.residence} onChange={handleInputChange} name="residence" className={`w-full p-2 border rounded-lg ${!isEditingChild ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500">Salvation Date</label>
                                                <input type="date" disabled={!isEditingChild} value={formData.salvationDate || ''} onChange={handleInputChange} name="salvationDate" className={`w-full p-2 border rounded-lg ${!isEditingChild ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100 mt-4">
                                            <h4 className="font-bold text-gray-800 text-sm flex items-center"><Users className="w-4 h-4 mr-2" /> Parent / Guardian Info</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500">Parent Name</label>
                                                    <input disabled={!isEditingChild} value={formData.parentName} onChange={handleInputChange} name="parentName" className={`w-full p-2 border rounded-lg ${!isEditingChild ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500">Contact</label>
                                                    <div className={!isEditingChild ? 'pointer-events-none opacity-80' : ''}>
                                                        <PhoneInput
                                                            disabled={!isEditingChild}
                                                            value={formData.parentContact}
                                                            onChange={(val) => setFormData({ ...formData, parentContact: val })}
                                                            className={`w-full ${!isEditingChild ? 'bg-gray-50 border-transparent' : 'bg-white'}`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {isEditingChild && (
                                            <div className="pt-4 flex justify-end">
                                                <button type="submit" className="bg-ministry-text text-white px-6 py-2 rounded-xl font-bold hover:bg-ministry-orange transition-colors">Save Changes</button>
                                            </div>
                                        )}
                                    </form>

                                    {/* Care Notes Section */}
                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> Care & Ministry Notes</h4>

                                        <div className="space-y-3 mb-4">
                                            <textarea
                                                value={newNote}
                                                onChange={e => setNewNote(e.target.value)}
                                                placeholder="Add a pastoral note, observation, or prayer request..."
                                                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:border-ministry-orange outline-none h-24 resize-none"
                                            />
                                            <div className="flex justify-between items-center">
                                                <select
                                                    value={noteType}
                                                    onChange={e => setNoteType(e.target.value as any)}
                                                    className="p-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none"
                                                >
                                                    <option value="Observation">Observation</option>
                                                    <option value="Prayer">Prayer Request</option>
                                                    <option value="Incident">Incident</option>
                                                    <option value="Communication">Communication</option>
                                                </select>
                                                <button
                                                    onClick={handleAddCareNote}
                                                    disabled={!newNote.trim()}
                                                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black disabled:opacity-50 transition-colors"
                                                >
                                                    Add Note
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                            {selectedChild.careNotes?.map((note: any) => (
                                                <div key={note.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${note.type === 'Incident' ? 'bg-red-100 text-red-600' : note.type === 'Prayer' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {note.type}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{new Date(note.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-gray-700 mt-1">{note.note}</p>
                                                    <p className="text-xs text-gray-400 mt-2 text-right">- {note.author}</p>
                                                </div>
                                            ))}
                                            {(!selectedChild.careNotes || selectedChild.careNotes.length === 0) && (
                                                <p className="text-center text-gray-400 text-xs py-4">No care notes yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Attendance History */}
                                <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                                    <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><History className="w-5 h-5" /> Recent Activity</h3>
                                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                        {history.map((evt, idx) => (
                                            <div key={evt.id || idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="p-2 bg-green-100 rounded-full mr-3">
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{evt.title}</p>
                                                    <p className="text-xs text-gray-500">{evt.date} • {evt.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {history.length === 0 && (
                                            <p className="text-center text-gray-400 py-8 text-sm">No attendance records found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* --- ADD CHILD FORM --- */}
                {viewMode === 'add-child' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                            <h2 className="text-xl font-bold text-ministry-text">
                                {activeTab === 'checkin' ? 'Register & Check-In' : 'Add New Profile'}
                            </h2>
                        </div>

                        <form onSubmit={handleAddChild} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Child's Name</label>
                                        <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="Full Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Age</label>
                                        <input required name="age" type="number" value={formData.age} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="Years" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                                    <h4 className="font-bold text-gray-800 text-sm flex items-center"><Users className="w-4 h-4 mr-2" /> Parent / Guardian Info</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Parent Name</label>
                                            <input required name="parentName" value={formData.parentName} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="Full Name" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Contact</label>
                                            <PhoneInput
                                                required
                                                value={formData.parentContact}
                                                onChange={(val) => setFormData({ ...formData, parentContact: val })}
                                                placeholder="700 000 000"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Residence</label>
                                        <input required name="residence" value={formData.residence} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="e.g. Entebbe, Kitoro" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">How did you hear about us?</label>
                                        <select name="howHeard" value={(formData as any).howHeard} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                                            <option value="">Select Option</option>
                                            <option value="Friend/Family">Friend / Family</option>
                                            <option value="Social Media">Social Media</option>
                                            <option value="Event">Event</option>
                                            <option value="Signage">Signage / Walk-in</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="px-8 py-3 bg-ministry-text text-white rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg w-full md:w-auto">
                                    {activeTab === 'checkin' ? 'Register & Check In' : 'Save to Database'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- BULK IMPORT FORM --- */}
                {viewMode === 'bulk-import' && (
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
                        <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                            <h2 className="text-xl font-bold text-ministry-text">Bulk Children Import</h2>
                        </div>

                        <form onSubmit={handleBulkSubmit} className="space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                                <p className="text-sm font-bold text-blue-800">Instructions</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Upload an Excel file or paste data.
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Format: <span className="font-mono bg-blue-100 px-1 rounded">Name | Gender | Age | Residence | Parent Name | Contact</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Upload Excel File</label>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ministry-orange file:text-white hover:file:bg-orange-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Or Paste Data (CSV / Excel Copy)</label>
                                <textarea
                                    required
                                    value={bulkText}
                                    onChange={e => setBulkText(e.target.value)}
                                    className="w-full p-4 h-64 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none font-mono text-sm whitespace-pre"
                                    placeholder={`Timothy Jr\tMale\t5\tEntebbe\tTim Senior\t256700111222\nSarah Joy\tFemale\t8\tKitoro\tMary Joy\t256700333444`}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="flex items-center space-x-2 bg-ministry-text text-white px-6 py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                    <Upload className="w-4 h-4" />
                                    <span>Import Children</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </div >
    );
};

export default NextGenDashboard;
