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
import { Outlet, NavLink, useSearchParams } from 'react-router-dom';
import { DollarSign, TrendingUp, CreditCard, FileText, Bus, X } from 'lucide-react';
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
import { useFinanceAnalytics } from '../../services/analyticsService';
import { KpiCard } from '../../components/ui/KpiCard';

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
    const [fleetViewMode, setFleetViewMode] = useState<'events' | 'vehicles'>('events');
    const [selectedFleetEvent, setSelectedFleetEvent] = useState<MinistryEvent | null>(null);
    const [fleetJourneyTab, setFleetJourneyTab] = useState<'Ongoing' | 'Return' | 'Cleared' | 'All'>('Ongoing');
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [financeForm, setFinanceForm] = useState({ dispatch: '', balance: '' });

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
        
        const approved = allVehicles.filter(v => !v.approvals || v.approvals.registration === 'Approved');
        
        if (fleetJourneyTab === 'Ongoing') return approved.filter(v => getVehicleJourneyStatus(v) === 'Ongoing');
        if (fleetJourneyTab === 'Return') return approved.filter(v => getVehicleJourneyStatus(v) === 'Return');
        return approved.filter(v => getVehicleJourneyStatus(v) === 'Cleared');
    }, [selectedFleetEvent, pickupStations, vehicles, fleetJourneyTab]);

    const handleOpenEventFleet = (event: MinistryEvent) => {
        setSelectedFleetEvent(event);
        setSelectedEventId(event.id);
        setFleetViewMode('vehicles');
        setFleetJourneyTab('Ongoing');
    };
    const handleBackToEvents = () => { setFleetViewMode('events'); setSelectedFleetEvent(null); };

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

    const handlePrintFleetReport = () => {
        if (!selectedFleetEvent) return;
        const eventStationIds = pickupStations.filter(s => s.eventId === selectedFleetEvent.id).map(s => s.id);
        const allEventVehicles = vehicles.filter(v => v.eventId === selectedFleetEvent.id || eventStationIds.includes(v.stationId));
        const totalPax = passengers.filter(p => allEventVehicles.some(v => v.id === p.vehicleId)).length;
        let sumBookingFee = 0, sumBalancePayment = 0, sumTotalCost = 0, sumFinalBalance = 0, totalExpenditure = 0;
        allEventVehicles.forEach(v => {
            const totalCost = parseFloat(v.financeDetails?.ongoingDispatch || '0');
            const bookingFee = parseFloat(v.financeDetails?.ongoingBalance || '0');
            const balancePayment = parseFloat(v.financeDetails?.returnDispatch || '0');
            totalExpenditure += bookingFee + balancePayment;
            sumBookingFee += bookingFee; sumBalancePayment += balancePayment;
            sumTotalCost += totalCost; sumFinalBalance += (totalCost - bookingFee - balancePayment);
        });
        const printWindow = window.open('', '_blank');
        if (!printWindow) return showToast('Please allow popups to print report', 'warning');
        printWindow.document.write(`<html><head><title>Fleet Finance Report</title><style>body{font-family:monospace;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px}th{background:#f0f0f0}.money{text-align:right}</style></head><body><h1>MINISTRY FLEET FINANCE REPORT</h1><h2>${selectedFleetEvent.title}</h2><p>Date: ${selectedFleetEvent.date}</p><div style="display:flex;justify-content:space-between;border:1px solid #000;padding:10px;margin-bottom:20px"><div>Total Vehicles: ${allEventVehicles.length}</div><div>Total Pax: ${totalPax}</div><div>Total Expenditure: ${formatMoney(totalExpenditure)}</div></div><table><thead><tr><th>No.</th><th>Plate</th><th>Driver</th><th>Contact</th><th>Pax</th><th class="money">Booking Fee</th><th class="money">Balance</th><th class="money">Total Cost</th><th class="money">Balance</th></tr></thead><tbody>${allEventVehicles.map((v, i) => {
            const tc = parseFloat(v.financeDetails?.ongoingDispatch || '0');
            const bf = parseFloat(v.financeDetails?.ongoingBalance || '0');
            const bp = parseFloat(v.financeDetails?.returnDispatch || '0');
            return `<tr><td>${i + 1}</td><td>${v.number_plate}</td><td>${v.driverName || '-'}</td><td>${v.driverContact || '-'}</td><td>${passengers.filter(p => p.vehicleId === v.id).length}</td><td class="money">${formatMoney(bf)}</td><td class="money">${formatMoney(bp)}</td><td class="money">${formatMoney(tc)}</td><td class="money">${formatMoney(tc - bf - bp)}</td></tr>`;
        }).join('')}<tr style="font-weight:bold;background:#f0f0f0;border-top:2px solid #000"><td colspan="4" style="text-align:right">TOTALS:</td><td>${totalPax}</td><td class="money">${formatMoney(sumBookingFee)}</td><td class="money">${formatMoney(sumBalancePayment)}</td><td class="money">${formatMoney(sumTotalCost)}</td><td class="money">${formatMoney(sumFinalBalance)}</td></tr></tbody></table><div style="margin-top:20px;text-align:center;font-size:10px">Generated on ${new Date().toLocaleString()}</div><script>window.onload=()=>window.print();</script></body></html>`);
        printWindow.document.close();
    };

    const generateAccountabilityHTML = useCallback((vehicle: Vehicle, globalManifest: any, manifestName: string) => {
        const vPassengers = passengers.filter(p => p.vehicleId === vehicle.id);
        const coordinator = availableCoordinators.find(u => u.name === vehicle.coordinator);
        const coordContact = coordinator?.contact || '______________________';
        const residents = vPassengers.filter(p => p.category === 'Member');
        const schoolStudents = vPassengers.filter(p => p.category === 'Student');
        const institutionStudents = vPassengers.filter(p => p.category === 'Institution');
        const totalSouls = vPassengers.length;
        const vehicleCost = parseFloat(vehicle.financeDetails?.ongoingDispatch || '0');
        const costPerHead = totalSouls > 0 ? vehicleCost / totalSouls : 0;
        return `<div style="page-break-after:always;padding:20px;height:95vh;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><div style="font-size:24px;font-weight:bold">${manifestName}</div><div style="font-size:18px;font-weight:bold;text-transform:uppercase;text-align:center;width:100%">Regional Transport Accountability Form</div>${globalManifest?.logoUrl ? `<img src="${globalManifest.logoUrl}" style="width:50px;height:50px;object-fit:contain;border-radius:50%;border:2px solid black">` : `<div style="font-size:10px;border:2px solid black;border-radius:50%;width:50px;height:50px;display:flex;align-items:center;justify-content:center;text-align:center">${manifestName}</div>`}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px"><div><div>REGION: <strong>CENTRAL</strong></div><div>MANIFEST NAME: <strong>${manifestName}</strong></div><div>MANIFEST ID: <strong>CTL/EBB01R</strong></div></div><div><div>EVENT NAME: <strong>${selectedFleetEvent?.title || ''}</strong></div><div>EVENT DATE: <strong>${selectedFleetEvent?.date || ''}</strong></div><div>COORD: <strong>${vehicle.coordinator}</strong></div><div>CONTACT: <strong>${coordContact}</strong></div></div></div><div style="background:black;color:white;font-weight:bold;padding:5px 10px;text-transform:uppercase">DRIVER DETAILS</div><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr><td style="border:1px solid black;padding:8px">NAME: <strong>${vehicle.driverName}</strong><br><br>NIN: <strong>${vehicle.driverNin}</strong></td><td style="border:1px solid black;padding:8px">CONTACT: <strong>${vehicle.driverContact}</strong><br><br>TYPE: <strong>${vehicle.type}</strong></td><td style="border:1px solid black;padding:8px">PLATE: <strong>${vehicle.number_plate}</strong></td></tr></table><table style="width:100%;border-collapse:collapse"><thead><tr><th style="border:1px solid black;padding:5px"></th><th style="border:1px solid black;padding:5px">RESIDENTS</th><th style="border:1px solid black;padding:5px">SCHOOLS</th><th style="border:1px solid black;padding:5px">INSTITUTIONS</th></tr></thead><tbody><tr><td style="border:1px solid black;padding:5px;font-weight:bold">NO TRANSPORTED:</td><td style="border:1px solid black;padding:5px;text-align:center">${residents.length || ''}</td><td style="border:1px solid black;padding:5px;text-align:center">${schoolStudents.length || ''}</td><td style="border:1px solid black;padding:5px;text-align:center">${institutionStudents.length || ''}</td></tr><tr><td style="border:1px solid black;padding:5px;font-weight:bold">FIRST TIMERS:</td><td style="border:1px solid black;padding:5px;text-align:center">${residents.filter(p => p.isFirstTime === 'Yes').length || ''}</td><td style="border:1px solid black;padding:5px;text-align:center">${schoolStudents.filter(p => p.isFirstTime === 'Yes').length || ''}</td><td style="border:1px solid black;padding:5px;text-align:center">${institutionStudents.filter(p => p.isFirstTime === 'Yes').length || ''}</td></tr><tr><td style="border:1px solid black;padding:5px;font-weight:bold;border-top:2px solid black">TOTAL SOULS:</td><td colspan="3" style="border:1px solid black;padding:5px;font-weight:bold;font-size:14px;text-align:center;border-top:2px solid black">${totalSouls}</td></tr></tbody></table><div style="background:black;color:white;font-weight:bold;padding:5px 10px;text-transform:uppercase;margin-top:10px">VEHICLE DETAILS</div><div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid black"><div style="border-right:1px solid black;padding:10px">COST OF VEHICLE: <strong>${formatMoney(vehicleCost)}</strong><br><br><br>VERIFIED BY: ___________</div><div style="padding:10px">COST PER HEAD: <strong>${formatMoney(costPerHead)}</strong><br><br><br>SIGNATURE: ___________</div></div></div>`;
    }, [passengers, availableCoordinators, selectedFleetEvent, formatMoney]);

    const handlePrintBatchAccountability = async (batchVehicles: Vehicle[]) => {
        const globalManifest = await ManifestStore.get();
        const manifestName = globalManifest?.name || 'MINISTRY MANIFEST';
        const pagesHtml = batchVehicles.map(v => generateAccountabilityHTML(v, globalManifest, manifestName)).join('');
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>Accountability Forms Batch</title><style>@media print{@page{size:landscape;margin:10mm}body{-webkit-print-color-adjust:exact}}body{font-family:Arial,sans-serif;font-size:11px;padding:0;margin:0}</style></head><body>${pagesHtml}<script>window.onload=()=>{setTimeout(()=>{window.print();},500)};<\/script></body></html>`);
        printWindow.document.close();
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
        fleetViewMode, setFleetViewMode, selectedFleetEvent, setSelectedFleetEvent,
        fleetJourneyTab, setFleetJourneyTab,
        selectedVehicle, setSelectedVehicle, financeForm, setFinanceForm,
        getEventVehicles, getVehicleJourneyStatus,
        handleOpenEventFleet, handleBackToEvents, handleViewVehicle,
        handleUpdateFinance, handleDispatchVehicle,
        handlePrintFleetReport, handlePrintAccountability, handlePrintBatchAccountability,
    };

    const { data: financeStats, isLoading: isFinanceStatsLoading } = useFinanceAnalytics();

    return (
        <FinanceContext.Provider value={contextValue}>
            <div className="flex flex-col min-h-full bg-gray-50">
                {/* Top Nav */}
                <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-wrap sticky top-0 z-20 gap-4">
                    <div className="flex items-center gap-2">
                        <NavLink to="income" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <TrendingUp className="w-4 h-4" /> Income
                        </NavLink>
                        <NavLink to="expenses" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <CreditCard className="w-4 h-4" /> Expenses
                        </NavLink>
                        <NavLink to="requisitions" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <FileText className="w-4 h-4" /> Requisitions
                        </NavLink>
                        <NavLink to="fleet" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <Bus className="w-4 h-4" /> Fleet Logistics
                        </NavLink>
                    </div>

                    {/* Event Selector */}
                    {events.length > 0 && (
                        <select 
                            value={selectedEventId} 
                            onChange={e => setSelectedEventId(e.target.value)}
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-ministry-orange"
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

                {/* KPI Summary Strip using new KpiCard */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <KpiCard 
                        label="Total Income" 
                        value={formatMoney(financeStats?.total_income ?? 0)} 
                        icon={TrendingUp} 
                        isLoading={isFinanceStatsLoading} 
                    />
                    <KpiCard 
                        label="Total Expenses" 
                        value={formatMoney(financeStats?.total_expenses ?? 0)} 
                        icon={CreditCard} 
                        isLoading={isFinanceStatsLoading} 
                    />
                    <KpiCard 
                        label="Net Balance" 
                        value={formatMoney((financeStats?.total_income ?? 0) - (financeStats?.total_expenses ?? 0))} 
                        icon={DollarSign} 
                        isLoading={isFinanceStatsLoading} 
                    />
                    <KpiCard 
                        label="Requisitions Pending" 
                        value={financeStats?.requisitions_pending ?? 0} 
                        icon={FileText} 
                        isLoading={isFinanceStatsLoading} 
                    />
                </div>

                <div className="flex-1"><Outlet /></div>
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
                                    {effectiveTab !== 'Cleared' && (
                                        <button onClick={handleDispatchVehicle}
                                            disabled={effectiveTab === 'Return' && selectedVehicle.currentStage !== 'FinanceApproval'}
                                            className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-colors ${effectiveTab === 'Return' && selectedVehicle.currentStage !== 'FinanceApproval' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-ministry-text text-white hover:bg-ministry-orange'}`}>
                                            {effectiveTab === 'Ongoing' ? 'Dispatch Vehicle' : 'Clear Balance & Approve'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </FinanceContext.Provider>
    );
};

export default FinanceLayout;
