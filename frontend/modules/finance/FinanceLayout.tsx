/**
 * FinanceLayout
 *
 * Shared state host for the Finance module.
 * Owns ALL fetching, realtime subscriptions, and mutation handlers
 * previously in FinanceDashboard.tsx monolith.
 *
 * Context + hook live in FinanceContext.ts (Vite Fast Refresh separation).
 * Pattern mirrors TransportationLayout exactly.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, NavLink, useSearchParams } from 'react-router-dom';
import { DollarSign, TrendingUp, CreditCard, FileText, Bus, X, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { useNotification } from '../../components/ui/NotificationSystem';
import { isEventLocked, isServiceClosed } from '../../utils';
import { VehicleStore, mapVehicleFromDB } from '../../database/vehicleStore';
import { FinanceStore, mapTransactionFromDB } from '../../database/financeStore';
import { LogisticsStore } from '../../database/logisticsStore';
import { ManifestStore } from '../../database/manifestStore';
import { RequisitionStore, mapRequisitionFromDB } from '../../database/requisitionStore';
import { UserStore } from '../../database/userStore';
import { supabase } from '../../services/supabaseClient';
import { Transaction, Requisition, Vehicle, Passenger, MinistryEvent } from '../../types';
import { FinanceContext, FinanceContextValue } from './FinanceContext';

// ─── Layout ───────────────────────────────────────────────────────────────────

const FinanceLayout: React.FC = () => {
    const { user } = useAuth();
    const { events } = useEvent();
    const { showToast } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Event selection ──────────────────────────────────────────────────────
    const selectedEventId = searchParams.get('eventId') || '';
    const setSelectedEventId = useCallback((id: string) => {
        setSearchParams(prev => {
            if (id) prev.set('eventId', id);
            else prev.delete('eventId');
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const activeFetchTarget = useRef<string | null>(null);

    // ── Shared data state ─────────────────────────────────────────────────────
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [pickupStations, setPickupStations] = useState<any[]>([]);
    const [availableCoordinators, setAvailableCoordinators] = useState<any[]>([]);
    const [currency, setCurrency] = useState('UGX');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [financeSummary, setFinanceSummary] = useState({ total_income: 0, total_expense: 0, net_balance: 0, transaction_count: 0 });

    // ── Transaction modal state ───────────────────────────────────────────────
    const [showTransModal, setShowTransModal] = useState(false);
    const [transForm, setTransForm] = useState({
        type: 'Income' as 'Income' | 'Expense',
        category: 'Tithes',
        amount: '',
        description: '',
        eventId: '',
        method: 'Cash' as const
    });

    // ── Requisition payment modal state ───────────────────────────────────────
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
    const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', transactionId: '' });

    // ── Fleet state ───────────────────────────────────────────────────────────
    const selectedFleetEvent = events.find(e => e.id === selectedEventId) || null;
    const fleetViewMode = selectedFleetEvent ? 'vehicles' : 'events';
    const [fleetJourneyTab, setFleetJourneyTab] = useState<'Ongoing' | 'Return' | 'Cleared' | 'All'>('Ongoing');
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [financeForm, setFinanceForm] = useState({ dispatch: '', balance: '' });
    const [printPayload, setPrintPayload] = useState<{
        type: 'fleet' | 'accountability';
        title: string;
        date: string;
        vehicles: Vehicle[];
        manifestName?: string;
        logoUrl?: string;
    } | null>(null);

    useEffect(() => {
        if (printPayload) {
            const handleAfterPrint = () => {
                setPrintPayload(null);
            };
            window.addEventListener('afterprint', handleAfterPrint);
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => {
                window.removeEventListener('afterprint', handleAfterPrint);
                clearTimeout(timer);
            };
        }
    }, [printPayload]);

    // Sync selectedVehicle with realtime vehicle updates
    useEffect(() => {
        if (selectedVehicle) {
            const updated = vehicles.find(v => v.id === selectedVehicle.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedVehicle)) {
                setSelectedVehicle(updated);
            }
        }
    }, [vehicles, selectedVehicle]);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const refreshData = useCallback(async (eventIdTrigger?: string) => {
        const targetEventId = typeof eventIdTrigger === 'string' ? eventIdTrigger : selectedEventId;
        // targetEventId can be empty string for Global view
        activeFetchTarget.current = targetEventId;
        try {
            setIsRefreshing(true);
            const [vehicleRes, transactionsRes, financeSummaryRes, requisitionsRes, stationRes, manifestRes, usersRes, passengerRes] = await Promise.all([
                VehicleStore.getVehicles(targetEventId ? { eventId: targetEventId } : {}),
                FinanceStore.getTransactions(targetEventId),
                FinanceStore.getEventSummary(targetEventId),
                RequisitionStore.getAll(),
                LogisticsStore.getStations(targetEventId),
                ManifestStore.get(),
                UserStore.getAll(targetEventId ? { eventId: targetEventId } : {}),
                VehicleStore.getPassengers(targetEventId ? { eventId: targetEventId } : {})
            ]);
            if (activeFetchTarget.current !== targetEventId) return;
            setVehicles(vehicleRes.status === 'success' ? vehicleRes.data : []);
            setTransactions(transactionsRes);
            setFinanceSummary(financeSummaryRes);
            setRequisitions(requisitionsRes);
            setPickupStations(stationRes.status === 'success' ? stationRes.data : []);
            if (manifestRes.currency) setCurrency(manifestRes.currency);
            setAvailableCoordinators(usersRes.status === 'success' ? usersRes.data : []);
            setPassengers(passengerRes.status === 'success' ? passengerRes.data : []);
        } catch (e) { console.error('[FinanceLayout] refreshData error:', e); }
        finally { setIsRefreshing(false); }
    }, [selectedEventId]);

    const refreshDataRef = useRef(refreshData);
    refreshDataRef.current = refreshData;

    // ── Realtime + fetch on event change ──────────────────────────────────────
    useEffect(() => {
        setTransactions([]); setRequisitions([]); setVehicles([]); setPassengers([]);
        const t = setTimeout(() => refreshDataRef.current(selectedEventId).catch(console.error), 0);

        const transFilter = selectedEventId ? `event_id=eq.${selectedEventId}` : undefined;
        const reqFilter = selectedEventId ? `event_id=eq.${selectedEventId}` : undefined;

        const channel = supabase
            .channel(`finance-layout-${selectedEventId || 'global'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions', ...(transFilter && { filter: transFilter }) }, ({ eventType, new: n, old: o }) => {
                if (eventType === 'INSERT') setTransactions(prev => prev.some(t => t.id === n.id) ? prev : [mapTransactionFromDB(n), ...prev]);
                else if (eventType === 'UPDATE') setTransactions(prev => prev.map(t => t.id === n.id ? mapTransactionFromDB(n) : t));
                else if (eventType === 'DELETE') setTransactions(prev => prev.filter(t => t.id !== o.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requisitions', ...(reqFilter && { filter: reqFilter }) }, ({ eventType, new: n, old: o }) => {
                if (eventType === 'INSERT') setRequisitions(prev => prev.some(r => r.id === n.id) ? prev : [mapRequisitionFromDB(n), ...prev]);
                else if (eventType === 'UPDATE') setRequisitions(prev => prev.map(r => r.id === n.id ? mapRequisitionFromDB(n) : r));
                else if (eventType === 'DELETE') setRequisitions(prev => prev.filter(r => r.id !== o.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, ({ eventType, new: n, old: o }) => {
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                    setVehicles(prev => {
                        const exists = prev.find(v => v.id === n.id);
                        if (exists) return prev.map(v => v.id === n.id ? mapVehicleFromDB(n) : v);
                        const belongsToEvent = n.event_id === selectedEventId;
                        const belongsToStation = pickupStations.some(s => s.id === n.station_id);
                        if (belongsToEvent || belongsToStation) return [...prev, mapVehicleFromDB(n)];
                        return prev;
                    });
                } else if (eventType === 'DELETE') setVehicles(prev => prev.filter(v => v.id !== o.id));
            })
            .subscribe();

        return () => { clearTimeout(t); supabase.removeChannel(channel); };
    }, [selectedEventId]);

    // ── Formatters ────────────────────────────────────────────────────────────
    const formatMoney = useCallback((amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount), [currency]);

    const formatMoneyInput = (val: string) => {
        if (!val) return '';
        const parts = val.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    };
    const parseMoneyInput = (val: string) => val.replace(/,/g, '');

    // ── Derived stats ─────────────────────────────────────────────────────────
    const totalIncome = transactions.filter(t => t.type === 'Income' && (!selectedEventId || t.eventId === selectedEventId)).reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense' && (!selectedEventId || t.eventId === selectedEventId)).reduce((s, t) => s + t.amount, 0);
    const pendingRequisitions = requisitions.filter(r => r.status === 'Pending' && (!selectedEventId || r.eventId === selectedEventId)).length;

    // ── Transaction handlers ──────────────────────────────────────────────────
    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const newT: Transaction = {
            id: crypto.randomUUID(),
            type: transForm.type,
            category: transForm.category,
            amount: parseFloat(transForm.amount),
            description: transForm.description,
            date: new Date().toISOString().split('T')[0],
            method: transForm.method,
            eventId: transForm.eventId
        };
        await FinanceStore.addTransaction(newT);
        setTransactions([newT, ...transactions]);
        setShowTransModal(false);
        setTransForm({ type: 'Income', category: 'Tithes', amount: '', description: '', eventId: '', method: 'Cash' });
    };

    // ── Requisition handlers ──────────────────────────────────────────────────
    const handleOpenPaymentModal = (req: Requisition) => {
        setSelectedRequisition(req);
        const remaining = req.totalAmount - (req.amountPaid || 0);
        setPayForm({ amount: remaining.toString(), method: 'Cash', transactionId: '' });
        setPayModalOpen(true);
    };

    const handleProcessPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequisition) return;
        const amount = parseFloat(payForm.amount);
        const alreadyPaid = selectedRequisition.amountPaid || 0;
        const remaining = selectedRequisition.totalAmount - alreadyPaid;
        if (amount <= 0) { showToast('Amount must be greater than 0', 'error'); return; }
        if (amount > remaining) { showToast(`Cannot exceed remaining balance of ${formatMoney(remaining)}`, 'error'); return; }
        if (payForm.method === 'Mobile Money' && !payForm.transactionId) { showToast('Please enter a Transaction ID for Mobile Money', 'error'); return; }
        try {
            const isFullPayment = (alreadyPaid + amount) >= selectedRequisition.totalAmount;
            await RequisitionStore.addPayment(selectedRequisition.id, {
                amount, method: payForm.method as any, transactionId: payForm.transactionId,
                paymentDate: new Date().toISOString(), recordedBy: user?.name || 'Finance Officer'
            }, alreadyPaid + amount, isFullPayment);
            showToast('Payment recorded successfully!', 'success');
            setPayModalOpen(false);
        } catch { showToast('Failed to record payment.', 'error'); }
    };

    // ── Fleet handlers ────────────────────────────────────────────────────────
    const getVehicleJourneyStatus = (v: Vehicle): 'Ongoing' | 'Return' | 'Cleared' => {
        if (v.journeyDirection === 'Return') {
            if (v.approvals?.finance === 'Approved') return 'Cleared';
            return 'Return';
        }
        // journeyDirection is 'Ongoing' or undefined:
        if (v.approvals?.finance === 'Approved') return 'Return';
        return 'Ongoing';
    };

    const getEventVehicles = useCallback((): Vehicle[] => {
        if (!selectedFleetEvent) return [];
        const eventStationIds = pickupStations.filter(s => s.eventId === selectedFleetEvent.id).map(s => s.id);
        const allVehicles = vehicles.filter(v => v.eventId === selectedFleetEvent.id || eventStationIds.includes(v.stationId));
        if (fleetJourneyTab === 'All') return allVehicles;
        
        if (fleetJourneyTab === 'Ongoing') {
            return allVehicles.filter(v => 
                (!v.approvals || v.approvals.registration === 'Approved') && 
                getVehicleJourneyStatus(v) === 'Ongoing'
            );
        }
        if (fleetJourneyTab === 'Return') {
            return allVehicles.filter(v => getVehicleJourneyStatus(v) === 'Return');
        }
        if (fleetJourneyTab === 'Cleared') {
            return allVehicles.filter(v => getVehicleJourneyStatus(v) === 'Cleared');
        }
        return [];
    }, [selectedFleetEvent, pickupStations, vehicles, fleetJourneyTab]);

    const handleOpenEventFleet = (event: MinistryEvent) => {
        setSelectedEventId(event.id);
        setFleetJourneyTab('Ongoing');
    };
    const handleBackToEvents = () => { setSelectedEventId(''); };

    const handleViewVehicle = (v: Vehicle) => {
        setSelectedVehicle(v);
        const status = getVehicleJourneyStatus(v);
        if (status === 'Ongoing') setFinanceForm({ dispatch: v.financeDetails?.ongoingDispatch || '', balance: v.financeDetails?.ongoingBalance || '' });
        else setFinanceForm({ dispatch: v.financeDetails?.returnDispatch || '', balance: v.financeDetails?.returnBalance || '' });
    };

    const handleUpdateFinance = async () => {
        if (!selectedVehicle) return;
        try {
            const updatedVehicle: Vehicle = {
                ...selectedVehicle,
                financeDetails: {
                    ...selectedVehicle.financeDetails,
                    ongoingDispatch: fleetJourneyTab === 'Ongoing' ? financeForm.dispatch : (selectedVehicle.financeDetails?.ongoingDispatch || ''),
                    ongoingBalance: fleetJourneyTab === 'Ongoing' ? financeForm.balance : (selectedVehicle.financeDetails?.ongoingBalance || ''),
                    returnDispatch: selectedVehicle.financeDetails?.returnDispatch || '',
                    returnBalance: selectedVehicle.financeDetails?.returnBalance || '',
                    processedAt: new Date().toISOString()
                }
            };
            await VehicleStore.updateVehicleFinance(updatedVehicle.id, updatedVehicle.financeDetails);
            setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
            setSelectedVehicle(updatedVehicle);
            showToast('Finance Details Updated Successfully', 'success');
        } catch (error: any) { showToast(`Failed to update: ${error.message || 'Unknown error'}`, 'error'); }
    };

    const handleDispatchVehicle = async () => {
        if (!selectedVehicle) return;
        try {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const updatedVehicle: Vehicle = {
                ...selectedVehicle,
                approvals: { ...selectedVehicle.approvals!, finance: 'Approved' },
                ongoingStartTime: fleetJourneyTab === 'Ongoing' ? now : selectedVehicle.ongoingStartTime,
                returnStartTime: fleetJourneyTab === 'Return' ? now : selectedVehicle.returnStartTime,
                financeDetails: {
                    ...selectedVehicle.financeDetails,
                    ongoingDispatch: fleetJourneyTab === 'Ongoing' ? financeForm.dispatch : (selectedVehicle.financeDetails?.ongoingDispatch || ''),
                    ongoingBalance: fleetJourneyTab === 'Ongoing' ? financeForm.balance : (selectedVehicle.financeDetails?.ongoingBalance || ''),
                    returnDispatch: fleetJourneyTab === 'Return'
                        ? String(parseFloat(selectedVehicle.financeDetails?.ongoingDispatch || '0') - parseFloat(selectedVehicle.financeDetails?.ongoingBalance || '0'))
                        : (selectedVehicle.financeDetails?.returnDispatch || ''),
                    returnBalance: fleetJourneyTab === 'Return' ? '0' : (selectedVehicle.financeDetails?.returnBalance || ''),
                    processedAt: new Date().toISOString()
                },
                currentStage: selectedVehicle.currentStage === 'FinanceApproval' ? 'Transit' : selectedVehicle.currentStage,
                journeyDirection: fleetJourneyTab === 'Return' ? 'Return' : selectedVehicle.journeyDirection
            };
            if (fleetJourneyTab === 'Ongoing' && (!updatedVehicle.financeDetails?.ongoingDispatch || updatedVehicle.financeDetails.ongoingDispatch === '0')) {
                if (!confirm('Total Vehicle Cost is 0 or empty. Are you sure?')) return;
            }
            await VehicleStore.updateVehicleFinance(updatedVehicle.id, updatedVehicle.financeDetails, updatedVehicle.currentStage, updatedVehicle.approvals, updatedVehicle.journeyDirection, updatedVehicle.ongoingStartTime, updatedVehicle.returnStartTime);
            setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
            setSelectedVehicle(null);
            showToast(fleetJourneyTab === 'Ongoing' ? 'Finance Updated & Vehicle Dispatched' : 'Return Journey Cleared & Vehicle Released', 'success');
        } catch (error: any) { showToast(`Failed to dispatch: ${error.message || 'Unknown error'}`, 'error'); }
    };

    const handlePrintFleetReport = (eventToPrint?: MinistryEvent | React.MouseEvent | null) => {
        const ev = (eventToPrint && typeof eventToPrint === 'object' && 'id' in eventToPrint)
            ? eventToPrint
            : selectedFleetEvent;
        if (!ev) return;
        const eventStationIds = pickupStations.filter(s => s.eventId === ev.id).map(s => s.id);
        const allEventVehicles = vehicles.filter(v => v.eventId === ev.id || eventStationIds.includes(v.stationId));
        
        setPrintPayload({
            type: 'fleet',
            title: ev.title,
            date: ev.date,
            vehicles: allEventVehicles
        });
    };

    const handlePrintBatchAccountability = async (batchVehicles: Vehicle[]) => {
        const globalManifest = await ManifestStore.get();
        const manifestName = globalManifest?.name || 'MINISTRY MANIFEST';
        
        setPrintPayload({
            type: 'accountability',
            title: selectedFleetEvent?.title || '',
            date: selectedFleetEvent?.date || '',
            vehicles: batchVehicles,
            manifestName,
            logoUrl: globalManifest?.logoUrl || undefined
        });
    };

    const handlePrintAccountability = async (vehicle: Vehicle) => {
        let printVehicle = vehicle;
        
        // Auto-save any local draft values if printing the currently open vehicle
        if (selectedVehicle && vehicle.id === selectedVehicle.id) {
            printVehicle = {
                ...selectedVehicle,
                financeDetails: {
                    ...selectedVehicle.financeDetails,
                    ongoingDispatch: fleetJourneyTab === 'Ongoing' ? financeForm.dispatch : (selectedVehicle.financeDetails?.ongoingDispatch || ''),
                    ongoingBalance: fleetJourneyTab === 'Ongoing' ? financeForm.balance : (selectedVehicle.financeDetails?.ongoingBalance || ''),
                    returnDispatch: selectedVehicle.financeDetails?.returnDispatch || '',
                    returnBalance: selectedVehicle.financeDetails?.returnBalance || '',
                    processedAt: new Date().toISOString()
                }
            };
            try {
                await VehicleStore.updateVehicleFinance(printVehicle.id, printVehicle.financeDetails);
                setVehicles(prev => prev.map(v => v.id === printVehicle.id ? printVehicle : v));
                setSelectedVehicle(printVehicle);
            } catch (error) {
                console.error('[FinanceLayout] Auto-save before print failed:', error);
            }
        }

        await handlePrintBatchAccountability([printVehicle]);
    };

    // ── Context value ─────────────────────────────────────────────────────────
    const contextValue: FinanceContextValue = {
        selectedEventId, setSelectedEventId, selectedEvent, events,
        transactions, requisitions, vehicles, passengers, pickupStations, availableCoordinators, currency,
        financeSummary, totalIncome, totalExpense, pendingRequisitions,
        isRefreshing, refreshData,
        formatMoney, formatMoneyInput, parseMoneyInput,
        showTransModal, setShowTransModal, transForm, setTransForm, handleAddTransaction,
        payModalOpen, setPayModalOpen, selectedRequisition, payForm, setPayForm,
        handleOpenPaymentModal, handleProcessPayment,
        fleetViewMode, selectedFleetEvent,
        fleetJourneyTab, setFleetJourneyTab,
        selectedVehicle, setSelectedVehicle, financeForm, setFinanceForm,
        getEventVehicles, getVehicleJourneyStatus,
        handleOpenEventFleet, handleBackToEvents, handleViewVehicle,
        handleUpdateFinance, handleDispatchVehicle,
        handlePrintFleetReport, handlePrintAccountability, handlePrintBatchAccountability,
    };

    const navTabs = [
        { to: 'overview', label: 'Dashboard', icon: DollarSign },
        { to: 'income', label: 'Income', icon: TrendingUp },
        { to: 'expenses', label: 'Expenses', icon: CreditCard },
        { to: 'requisitions', label: 'Requests', icon: FileText },
        { to: 'fleet', label: 'Fleet', icon: Bus },
    ];

    return (
        <FinanceContext.Provider value={contextValue}>
            <div className="flex flex-col min-h-full bg-gray-50">
                {/* Desktop Top Nav — hidden on mobile */}
                <div className="hidden md:block w-full overflow-x-auto hide-scrollbar pt-6 px-6">
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center gap-1 bg-white/60 backdrop-blur-md p-1.5 rounded-full border border-gray-100 shadow-sm">
                            {navTabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <NavLink
                                        key={tab.to}
                                        to={selectedEventId ? `${tab.to}?eventId=${selectedEventId}` : tab.to}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${isActive ? 'bg-black text-white shadow-md ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'}`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <Icon strokeWidth={2.5} className={`w-4 h-4 ${isActive ? 'text-ministry-neon' : ''}`} />
                                                {tab.label}
                                            </>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>

                    {/* Event Selector */}
                    {events.length > 0 && (
                        <select
                            value={selectedEventId}
                            onChange={e => setSelectedEventId(e.target.value)}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 outline-none focus:border-ministry-orange shadow-sm"
                        >
                            <option value="">-- View All (Global) --</option>
                            {events.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.date} • {ev.title}
                                </option>
                            ))}
                        </select>
                    )}
                    </div>
                </div>

                {/* Content — no padding on mobile (edge-to-edge), padded on desktop */}
                <div className="flex-1 pb-28 md:pb-0"><React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense></div>
            </div>

            {/* ── Mobile Floating Bottom Navigation ────────────────────────── */}
            <div className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
                <div className="flex items-center justify-between gap-0.5 bg-white/75 backdrop-blur-2xl p-2 rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    {navTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <NavLink
                                key={tab.to}
                                to={selectedEventId ? `${tab.to}?eventId=${selectedEventId}` : tab.to}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center w-full py-2 rounded-full transition-all duration-300 relative overflow-hidden ${
                                        isActive ? 'text-ministry-neon' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute inset-0 bg-black rounded-full scale-100 animate-in zoom-in duration-300" />
                                        )}
                                        <div className="relative z-10 flex flex-col items-center gap-0.5">
                                            <Icon strokeWidth={isActive ? 2.5 : 2} className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-ministry-neon scale-110' : ''}`} />
                                            <span className={`text-[10px] tracking-wide transition-all duration-300 ${isActive ? 'font-bold text-ministry-neon' : 'font-medium'}`}>
                                                {tab.label}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            {/* ── Transaction Modal ──────────────────────────────────────────── */}
            {showTransModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Add {transForm.type}</h3>
                            <button onClick={() => setShowTransModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button type="button" onClick={() => setTransForm({ ...transForm, type: 'Income' })} className={`flex-1 py-2 rounded-md text-sm font-bold ${transForm.type === 'Income' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>Income</button>
                                <button type="button" onClick={() => setTransForm({ ...transForm, type: 'Expense' })} className={`flex-1 py-2 rounded-md text-sm font-bold ${transForm.type === 'Expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}>Expense</button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Related Event (Optional)</label>
                                <select value={transForm.eventId} onChange={e => setTransForm({ ...transForm, eventId: e.target.value })} className="w-full p-3 border rounded-xl bg-white">
                                    <option value="">-- General / None --</option>
                                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.date} - {ev.title}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Amount ({currency})</label>
                                <input required type="text" inputMode="numeric" onWheel={e => e.currentTarget.blur()} onKeyDown={e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
                                    value={formatMoneyInput(transForm.amount)}
                                    onChange={e => { const raw = parseMoneyInput(e.target.value); if (!isNaN(Number(raw))) setTransForm({ ...transForm, amount: raw }); }}
                                    className="w-full p-3 border rounded-xl" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                <input required value={transForm.description} onChange={e => setTransForm({ ...transForm, description: e.target.value })} className="w-full p-3 border rounded-xl" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowTransModal(false)} className="px-4 py-2 text-gray-600 font-bold">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange">Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Payment Modal ──────────────────────────────────────────────── */}
            {payModalOpen && selectedRequisition && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div><h3 className="text-xl font-bold">Process Payment</h3><p className="text-sm text-gray-500">{selectedRequisition.title}</p></div>
                            <button onClick={() => setPayModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl mb-6">
                            <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Total Requested</span><span className="font-bold">{formatMoney(selectedRequisition.totalAmount)}</span></div>
                            <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Already Paid</span><span className="font-bold text-green-600">{formatMoney(selectedRequisition.amountPaid || 0)}</span></div>
                            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2"><span className="font-bold text-gray-700">Remaining Balance</span><span className="font-bold text-ministry-orange">{formatMoney(selectedRequisition.totalAmount - (selectedRequisition.amountPaid || 0))}</span></div>
                        </div>
                        <form onSubmit={handleProcessPayment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Amount</label>
                                <input type="text" inputMode="numeric" required onWheel={e => e.currentTarget.blur()} onKeyDown={e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
                                    value={formatMoneyInput(payForm.amount)}
                                    onChange={e => { const raw = parseMoneyInput(e.target.value); if (!isNaN(Number(raw))) setPayForm({ ...payForm, amount: raw }); }}
                                    className="w-full p-3 border border-gray-200 rounded-xl font-mono text-lg font-bold" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                                <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-white">
                                    <option value="Cash">Cash</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Bank">Bank Transfer</option>
                                </select>
                            </div>
                            {payForm.method === 'Mobile Money' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction ID</label>
                                    <input type="text" required placeholder="e.g. PPK477..." value={payForm.transactionId} onChange={e => setPayForm({ ...payForm, transactionId: e.target.value.toUpperCase() })} className="w-full p-3 border border-gray-200 rounded-xl font-mono" />
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPayModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200">Confirm Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Vehicle Finance Modal ──────────────────────────────────────── */}
            {selectedVehicle && (() => {
                const vPax = passengers.filter(p => p.vehicleId === selectedVehicle.id);
                const effectiveTab = getVehicleJourneyStatus(selectedVehicle);
                return (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-3xl font-bold font-mono text-ministry-text">{selectedVehicle.number_plate}</h3>
                                    <p className="text-lg text-gray-700">{selectedVehicle.type} • {selectedVehicle.driverName}</p>
                                    <p className="text-sm text-gray-500">{selectedVehicle.driverContact}</p>
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                        <p className="text-sm font-bold text-gray-700">Coord: {selectedVehicle.coordinator || 'N/A'}</p>
                                        {selectedVehicle.coordinatorContact && <p className="text-xs text-gray-500">{selectedVehicle.coordinatorContact}</p>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-bold text-ministry-orange">{vPax.length}</div>
                                    <div className="text-sm font-bold text-gray-400 uppercase">Total Pax</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {[
                                    { label: 'First Timers', value: vPax.filter(p => p.isFirstTime === 'Yes').length },
                                    { label: 'Students', value: vPax.filter(p => p.category === 'Student').length },
                                    { label: 'Institution', value: vPax.filter(p => p.category === 'Institution').length },
                                ].map(s => (
                                    <div key={s.label} className="border border-gray-200 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {effectiveTab === 'Ongoing' && (
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    {[
                                        { label: `Total Vehicle Cost (${currency})`, key: 'dispatch' },
                                        { label: `Booking Fee Paid (${currency})`, key: 'balance' },
                                    ].map(f => (
                                        <div key={f.key} className="space-y-2">
                                            <label className="text-sm font-bold text-ministry-text uppercase">{f.label}</label>
                                            <input type="text" inputMode="numeric" onWheel={e => e.currentTarget.blur()} onKeyDown={e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
                                                value={formatMoneyInput(financeForm[f.key as 'dispatch' | 'balance'])}
                                                onChange={e => { const raw = parseMoneyInput(e.target.value); if (!isNaN(Number(raw))) setFinanceForm({ ...financeForm, [f.key]: raw }); }}
                                                className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg font-bold focus:border-ministry-orange outline-none" placeholder="0" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {effectiveTab === 'Return' && (() => {
                                const tc = parseFloat(selectedVehicle.financeDetails?.ongoingDispatch || '0');
                                const bf = parseFloat(selectedVehicle.financeDetails?.ongoingBalance || '0');
                                return (
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2"><label className="text-sm font-bold text-gray-500 uppercase">Total Agreed Cost</label><div className="w-full p-4 bg-gray-50 rounded-xl text-lg font-bold text-gray-700">{formatMoney(tc)}</div></div>
                                        <div className="space-y-2"><label className="text-sm font-bold text-gray-500 uppercase">Less: Booking Fee</label><div className="w-full p-4 bg-gray-50 rounded-xl text-lg font-bold text-gray-700">{formatMoney(bf)}</div></div>
                                        <div className="col-span-full space-y-2">
                                            <label className="text-sm font-bold text-ministry-orange uppercase">Balance to Clear ({currency})</label>
                                            <input type="number" value={tc - bf} disabled className="w-full p-4 border-2 border-ministry-orange bg-orange-50 rounded-xl text-xl font-bold text-ministry-orange outline-none" />
                                            <p className="text-xs text-gray-400">This balance will be marked as cleared upon approval.</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {effectiveTab === 'Cleared' && (
                                <div className="mt-4 p-6 bg-green-50 border border-green-100 rounded-2xl text-center space-y-3 mb-6">
                                    <div className="flex justify-center"><div className="p-3 bg-green-100 rounded-full text-green-600">✓</div></div>
                                    <div>
                                        <p className="text-sm text-green-700 font-bold uppercase">Financial Clearance Complete</p>
                                        <p className="text-3xl font-black text-green-800 mt-1">{formatMoney(parseFloat(selectedVehicle.financeDetails?.ongoingBalance || '0') + parseFloat(selectedVehicle.financeDetails?.returnDispatch || '0'))}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                                <button onClick={() => handlePrintAccountability(selectedVehicle)} className="px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 flex items-center gap-2">
                                    🖨️ Print Form
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={() => setSelectedVehicle(null)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Cancel</button>
                                    {effectiveTab !== 'Cleared' && (() => {
                                        const isRegApproved = !selectedVehicle.approvals || selectedVehicle.approvals.registration === 'Approved';
                                        const isReturnDisabled = effectiveTab === 'Return' && selectedVehicle.currentStage !== 'FinanceApproval';
                                        const isDisabled = (effectiveTab === 'Ongoing' && !isRegApproved) || isReturnDisabled;
                                        
                                        return (
                                            <button onClick={handleDispatchVehicle}
                                                disabled={isDisabled}
                                                className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-colors ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-ministry-text text-white hover:bg-ministry-orange'}`}>
                                                {effectiveTab === 'Ongoing' ? (isRegApproved ? 'Dispatch Vehicle' : 'Pending Registration') : 'Clear Balance & Approve'}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {printPayload && createPortal(
                <div className="print-area">
                    {printPayload.type === 'fleet' ? (
                        <FleetPrintReport
                            title={printPayload.title}
                            date={printPayload.date}
                            vehicles={printPayload.vehicles}
                            passengers={passengers}
                            formatMoney={formatMoney}
                        />
                    ) : (
                        <AccountabilityPrintReport
                            vehicles={printPayload.vehicles}
                            passengers={passengers}
                            availableCoordinators={availableCoordinators}
                            eventTitle={printPayload.title}
                            eventDate={printPayload.date}
                            manifestName={printPayload.manifestName || ''}
                            logoUrl={printPayload.logoUrl}
                            formatMoney={formatMoney}
                        />
                    )}
                </div>,
                document.body
            )}
        </FinanceContext.Provider>
    );
};

// ─── Print helper components ────────────────────────────────────────────────

const FleetPrintReport: React.FC<{
    title: string;
    date: string;
    vehicles: Vehicle[];
    passengers: Passenger[];
    formatMoney: (val: number) => string;
}> = ({ title, date, vehicles, passengers, formatMoney }) => {
    let sumBookingFee = 0, sumBalancePayment = 0, sumTotalCost = 0, sumFinalBalance = 0, totalExpenditure = 0;
    const totalPax = passengers.filter(p => vehicles.some(v => v.id === p.vehicleId)).length;
    
    vehicles.forEach(v => {
        const totalCost = parseFloat(v.financeDetails?.ongoingDispatch || '0');
        const bookingFee = parseFloat(v.financeDetails?.ongoingBalance || '0');
        const balancePayment = parseFloat(v.financeDetails?.returnDispatch || '0');
        totalExpenditure += bookingFee + balancePayment;
        sumBookingFee += bookingFee; sumBalancePayment += balancePayment;
        sumTotalCost += totalCost; sumFinalBalance += (totalCost - bookingFee - balancePayment);
    });

    return (
        <div className="p-8 font-mono text-xs bg-white text-black">
            <h1 className="text-2xl font-bold mb-1">MINISTRY FLEET FINANCE REPORT</h1>
            <h2 className="text-lg font-bold mb-2">{title}</h2>
            <p className="mb-4">Date: {date}</p>
            
            <div className="flex justify-between border border-black p-4 mb-6 font-bold text-sm">
                <div>Total Vehicles: {vehicles.length}</div>
                <div>Total Pax: {totalPax}</div>
                <div>Total Expenditure: {formatMoney(totalExpenditure)}</div>
            </div>
            
            <table className="w-full border-collapse border border-gray-400">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-400 p-2 text-left">No.</th>
                        <th className="border border-gray-400 p-2 text-left">Plate</th>
                        <th className="border border-gray-400 p-2 text-left">Driver</th>
                        <th className="border border-gray-400 p-2 text-left">Contact</th>
                        <th className="border border-gray-400 p-2 text-center">Pax</th>
                        <th className="border border-gray-400 p-2 text-right">Booking Fee</th>
                        <th className="border border-gray-400 p-2 text-right">Balance Paid</th>
                        <th className="border border-gray-400 p-2 text-right">Total Cost</th>
                        <th className="border border-gray-400 p-2 text-right">Balance Due</th>
                    </tr>
                </thead>
                <tbody>
                    {vehicles.map((v, i) => {
                        const tc = parseFloat(v.financeDetails?.ongoingDispatch || '0');
                        const bf = parseFloat(v.financeDetails?.ongoingBalance || '0');
                        const bp = parseFloat(v.financeDetails?.returnDispatch || '0');
                        const paxCount = passengers.filter(p => p.vehicleId === v.id).length;
                        return (
                            <tr key={v.id}>
                                <td className="border border-gray-400 p-2">{i + 1}</td>
                                <td className="border border-gray-400 p-2 font-mono font-bold">{v.number_plate}</td>
                                <td className="border border-gray-400 p-2">{v.driverName || '-'}</td>
                                <td className="border border-gray-400 p-2">{v.driverContact || '-'}</td>
                                <td className="border border-gray-400 p-2 text-center">{paxCount}</td>
                                <td className="border border-gray-400 p-2 text-right">{formatMoney(bf)}</td>
                                <td className="border border-gray-400 p-2 text-right">{formatMoney(bp)}</td>
                                <td className="border border-gray-400 p-2 text-right">{formatMoney(tc)}</td>
                                <td className="border border-gray-400 p-2 text-right">{formatMoney(tc - bf - bp)}</td>
                            </tr>
                        );
                    })}
                    <tr className="font-bold bg-gray-100">
                        <td colSpan={4} className="border border-gray-400 p-2 text-right">TOTALS:</td>
                        <td className="border border-gray-400 p-2 text-center">{totalPax}</td>
                        <td className="border border-gray-400 p-2 text-right">{formatMoney(sumBookingFee)}</td>
                        <td className="border border-gray-400 p-2 text-right">{formatMoney(sumBalancePayment)}</td>
                        <td className="border border-gray-400 p-2 text-right">{formatMoney(sumTotalCost)}</td>
                        <td className="border border-gray-400 p-2 text-right">{formatMoney(sumFinalBalance)}</td>
                    </tr>
                </tbody>
            </table>
            <div className="mt-8 text-center text-[10px] text-gray-500">
                Generated on {new Date().toLocaleString()}
            </div>
        </div>
    );
};

const AccountabilityPrintReport: React.FC<{
    vehicles: Vehicle[];
    passengers: Passenger[];
    availableCoordinators: any[];
    eventTitle: string;
    eventDate: string;
    manifestName: string;
    logoUrl?: string;
    formatMoney: (val: number) => string;
}> = ({ vehicles, passengers, availableCoordinators, eventTitle, eventDate, manifestName, logoUrl, formatMoney }) => {
    return (
        <div className="bg-white text-black font-sans text-xs">
            {vehicles.map((v) => {
                const vPassengers = passengers.filter(p => p.vehicleId === v.id);
                const coordinator = availableCoordinators.find(u => u.name === v.coordinator);
                const coordContact = coordinator?.contact || '______________________';
                const residents = vPassengers.filter(p => p.category === 'Member');
                const schoolStudents = vPassengers.filter(p => p.category === 'Student');
                const institutionStudents = vPassengers.filter(p => p.category === 'Institution');
                const totalSouls = vPassengers.length;
                const vehicleCost = parseFloat(v.financeDetails?.ongoingDispatch || '0');
                const costPerHead = totalSouls > 0 ? vehicleCost / totalSouls : 0;

                return (
                    <div key={v.id} className="page-break-after-always">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <div className="text-xl font-bold">{manifestName}</div>
                                <div className="text-sm font-bold uppercase text-center flex-1">Regional Transport Accountability Form</div>
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-full border-2 border-black" />
                                ) : (
                                    <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center text-[8px] text-center font-bold">{manifestName}</div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6 border border-gray-300 p-4 rounded-lg bg-gray-50">
                                <div>
                                    <div className="mb-1">REGION: <strong>CENTRAL</strong></div>
                                    <div className="mb-1">MANIFEST NAME: <strong>{manifestName}</strong></div>
                                    <div>MANIFEST ID: <strong>CTL/EBB01R</strong></div>
                                </div>
                                <div>
                                    <div className="mb-1">EVENT NAME: <strong>{eventTitle}</strong></div>
                                    <div className="mb-1">EVENT DATE: <strong>{eventDate}</strong></div>
                                    <div className="mb-1">COORD: <strong>{v.coordinator}</strong></div>
                                    <div>CONTACT: <strong>{coordContact}</strong></div>
                                </div>
                            </div>

                            <div className="bg-black text-white font-bold px-3 py-1.5 uppercase text-[10px] tracking-wider rounded mb-3">DRIVER DETAILS</div>
                            <table className="w-full border-collapse mb-6 text-sm">
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-3 w-1/3">
                                            NAME: <strong>{v.driverName}</strong><br />NIN: <strong>{v.driverNin}</strong>
                                        </td>
                                        <td className="border border-black p-3 w-1/3">
                                            CONTACT: <strong>{v.driverContact}</strong><br />TYPE: <strong>{v.type}</strong>
                                        </td>
                                        <td className="border border-black p-3 w-1/3 font-mono font-bold text-center text-lg">
                                            PLATE: {v.number_plate}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="bg-black text-white font-bold px-3 py-1.5 uppercase text-[10px] tracking-wider rounded mb-3">PASSENGER DETAILS</div>
                            <table className="w-full border-collapse mb-6 text-center text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-black p-2"></th>
                                        <th className="border border-black p-2">RESIDENTS</th>
                                        <th className="border border-black p-2">SCHOOLS</th>
                                        <th className="border border-black p-2">INSTITUTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-2 font-bold text-left">NO TRANSPORTED:</td>
                                        <td className="border border-black p-2">{residents.length || '-'}</td>
                                        <td className="border border-black p-2">{schoolStudents.length || '-'}</td>
                                        <td className="border border-black p-2">{institutionStudents.length || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-2 font-bold text-left">FIRST TIMERS:</td>
                                        <td className="border border-black p-2">{residents.filter(p => p.isFirstTime === 'Yes').length || '-'}</td>
                                        <td className="border border-black p-2">{schoolStudents.filter(p => p.isFirstTime === 'Yes').length || '-'}</td>
                                        <td className="border border-black p-2">{institutionStudents.filter(p => p.isFirstTime === 'Yes').length || '-'}</td>
                                    </tr>
                                    <tr className="font-bold bg-gray-50 text-base">
                                        <td className="border border-black p-2 text-left">TOTAL SOULS:</td>
                                        <td colSpan={3} className="border border-black p-2 text-center">{totalSouls}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <div className="bg-black text-white font-bold px-3 py-1.5 uppercase text-[10px] tracking-wider rounded mb-3">FINANCIAL DETAILS</div>
                            <div className="grid grid-cols-2 border border-black rounded p-4 text-sm gap-y-4">
                                <div>COST OF VEHICLE: <strong>{formatMoney(vehicleCost)}</strong></div>
                                <div>COST PER HEAD: <strong>{formatMoney(costPerHead)}</strong></div>
                                <div className="mt-4">VERIFIED BY: ______________________</div>
                                <div className="mt-4">SIGNATURE: ______________________</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FinanceLayout;
