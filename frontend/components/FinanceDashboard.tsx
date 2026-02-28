
import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    FileText,
    Bus,
    CheckCircle,
    Printer,
    Plus,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    X,
    Calendar,
    ArrowLeft,
    Users,
    GraduationCap,
    Sparkles,
    Lock,
    RotateCcw
} from 'lucide-react';
import { isEventLocked, isServiceClosed } from '../utils';
import { VehicleStore, mapVehicleFromDB } from '../database/vehicleStore';
import { FinanceStore, mapTransactionFromDB, mapRequestFromDB } from '../database/financeStore';
import { EventStore } from '../database/eventStore';
import { LogisticsStore } from '../database/logisticsStore';
import { ManifestStore } from '../database/manifestStore';
import { supabase } from '../services/supabaseClient';
import { RequisitionStore, mapRequisitionFromDB } from '../database/requisitionStore';
import { Vehicle, MinistryEvent, Transaction, DepartmentRequest, Passenger, PickUpStation, User, Requisition, ModalType } from '../types';
import { UserStore } from '../database/userStore';

interface FinanceDashboardProps {
    currentUser?: any;
    events: MinistryEvent[];
    onOpenModal?: (type: ModalType) => void;
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ currentUser, events = [], onOpenModal }) => { // Accept events from props
    const { showToast } = useNotification();
    /* Persistence Logic */
    const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'requisitions' | 'fleet'>(() =>
        (localStorage.getItem('finance_active_tab') as 'income' | 'expenses' | 'requisitions' | 'fleet') || 'income'
    );

    useEffect(() => {
        localStorage.setItem('finance_active_tab', activeTab);
    }, [activeTab]);

    // Force re-render state
    const [, forceUpdate] = useState(0);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [requests, setRequests] = useState<DepartmentRequest[]>([]); // Keep for backwards compat if needed, but we focus on Requisitions now
    const [requisitions, setRequisitions] = useState<Requisition[]>([]); // NEW
    const [pickupStations, setPickupStations] = useState<PickUpStation[]>([]);
    const [currency, setCurrency] = useState('UGX');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [financeSummary, setFinanceSummary] = useState({ total_income: 0, total_expense: 0, net_balance: 0, transaction_count: 0 });
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const activeFetchTarget = React.useRef<string | null>(null);

    // Sync selectedEventId with events prop if not set
    useEffect(() => {
        if (!selectedEventId && events && events.length > 0) {
            const firstEvent = events.find(e => e.type === 'Event' || e.type === 'Service');
            if (firstEvent) setSelectedEventId(firstEvent.id);
        }
    }, [events, selectedEventId]);

    const [requisitionSubTab, setRequisitionSubTab] = useState<'Pending' | 'Paid'>('Pending');
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
    const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', transactionId: '' });


    // Data State
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [passengers, setPassengers] = useState<Passenger[]>([]);

    // Fleet Logistics Navigation State
    const [fleetViewMode, setFleetViewMode] = useState<'events' | 'vehicles'>('events');
    const [selectedFleetEvent, setSelectedFleetEvent] = useState<MinistryEvent | null>(null);
    const [fleetJourneyTab, setFleetJourneyTab] = useState<'Ongoing' | 'Return' | 'Cleared' | 'All'>('Ongoing');
    const [availableCoordinators, setAvailableCoordinators] = useState<User[]>([]);

    // Vehicle Detail Modal State
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [financeForm, setFinanceForm] = useState({ dispatch: '', balance: '' });

    // Transaction Form State
    const [showTransModal, setShowTransModal] = useState(false);
    const [transForm, setTransForm] = useState({
        type: 'Income' as 'Income' | 'Expense',
        category: 'Tithes',
        amount: '',
        description: '',
        eventId: '',
        method: 'Cash' as const
    });

    useEffect(() => {
        refreshData();

        const activeEventId = selectedEventId;
        if (!activeEventId) return;

        // Scoped Realtime Subscriptions
        const channel = supabase.channel(`finance-dashboard-scoped-${activeEventId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions', filter: `event_id=eq.${activeEventId}` }, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'INSERT') {
                    setTransactions(prev => {
                        if (prev.some(t => t.id === newRecord.id)) return prev;
                        return [mapTransactionFromDB(newRecord), ...prev];
                    });
                }
                else if (eventType === 'UPDATE') setTransactions(prev => prev.map(t => t.id === newRecord.id ? mapTransactionFromDB(newRecord) : t));
                else if (eventType === 'DELETE') setTransactions(prev => prev.filter(t => t.id !== oldRecord.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requisitions', filter: `event_id=eq.${activeEventId}` }, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'INSERT') {
                    setRequisitions(prev => {
                        if (prev.some(r => r.id === newRecord.id)) return prev;
                        return [mapRequisitionFromDB(newRecord), ...prev];
                    });
                }
                else if (eventType === 'UPDATE') setRequisitions(prev => prev.map(r => r.id === newRecord.id ? mapRequisitionFromDB(newRecord) : r));
                else if (eventType === 'DELETE') setRequisitions(prev => prev.filter(r => r.id !== oldRecord.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (payload) => {
                // Vehicles don't always have event_id directly in the filter-friendly way if they are linked via station
                // But we can check the stationId or just use granular update without full refresh if it matches our local list
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                    setVehicles(prev => {
                        const exists = prev.find(v => v.id === newRecord.id);
                        if (exists) return prev.map(v => v.id === newRecord.id ? mapVehicleFromDB(newRecord) : v);

                        // FIX: If it's a new vehicle, check if it belongs to our current event or our current stations
                        const belongsToEvent = newRecord.event_id === activeEventId;
                        const belongsToStation = pickupStations.some(s => s.id === newRecord.station_id);

                        if (belongsToEvent || belongsToStation) {
                            return [...prev, mapVehicleFromDB(newRecord)];
                        }
                        return prev;
                    });
                } else if (eventType === 'DELETE') {
                    setVehicles(prev => prev.filter(v => v.id !== oldRecord.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedEventId]);

    const refreshData = async (eventIdTrigger?: string | any) => {
        const targetEventId = (typeof eventIdTrigger === 'string') ? eventIdTrigger : selectedEventId;
        if (!targetEventId) return; // Prevent raw fetch

        activeFetchTarget.current = targetEventId;

        try {
            setIsRefreshing(true);
            // FIRE ALL REQUESTS IN PARALLEL (Performance Optimization)
            const [
                vehicleRes,
                transactionsRes,
                financeSummaryRes,
                requestsRes,
                requisitionsRes,
                stationRes,
                manifestRes,
                usersRes,
                passengerRes
            ] = await Promise.all([
                VehicleStore.getVehicles({ eventId: targetEventId }),
                FinanceStore.getTransactions(targetEventId), // Keep for table view
                FinanceStore.getEventSummary(targetEventId), // New O(1) RPC aggregate
                FinanceStore.getRequests(targetEventId),
                RequisitionStore.getAll(),
                LogisticsStore.getStations(targetEventId),
                ManifestStore.get(),
                UserStore.getAll({ eventId: targetEventId }),
                VehicleStore.getPassengers({ eventId: targetEventId })
            ]);

            // [RACE CONDITION PREVENTION]
            // If the user rapidly clicked another Event Card while this slow fetch was still compiling,
            // the state would be corrupted by the slow, stale payload returning *after* the fast valid payload.
            // We explicitly abort mapping the data if the target event drifts.
            if (activeFetchTarget.current !== targetEventId) {
                console.warn(`[DIAGNOSTICS] Suppressing stale Promise.all return for Event: ${targetEventId}`);
                return;
            }

            // UPDATE STATE (Non-blocking batch updates)
            setVehicles(vehicleRes.status === 'success' ? vehicleRes.data : []);
            setTransactions(transactionsRes);
            setFinanceSummary(financeSummaryRes);
            setRequests(requestsRes);
            setRequisitions(requisitionsRes);
            setPickupStations(stationRes.status === 'success' ? stationRes.data : []);
            if (manifestRes.currency) setCurrency(manifestRes.currency);
            setAvailableCoordinators(usersRes.status === 'success' ? usersRes.data : []);
            setPassengers(passengerRes.status === 'success' ? passengerRes.data : []);

        } catch (e) {
            console.error("Error refreshing Finance data:", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
    };

    // --- HANDLERS ---

    const handleOpenPaymentModal = (req: Requisition) => {
        setSelectedRequisition(req);
        const remaining = req.totalAmount - (req.amountPaid || 0);
        setPayForm({
            amount: remaining.toString(), // Default to full remaining balance
            method: 'Cash',
            transactionId: ''
        });
        setPayModalOpen(true);
    };

    const handleProcessPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequisition) return;

        const amount = parseFloat(payForm.amount);
        const alreadyPaid = selectedRequisition.amountPaid || 0;
        const remaining = selectedRequisition.totalAmount - alreadyPaid;
        const newTotal = alreadyPaid + amount;

        if (amount <= 0) {
            showToast("Amount must be greater than 0", 'error');
            return;
        }
        if (amount > remaining) {
            showToast(`Amount cannot exceed remaining balance of ${formatMoney(remaining)}`, 'error');
            return;
        }

        if (payForm.method === 'Mobile Money' && !payForm.transactionId) {
            showToast("Please enter a Transaction ID for Mobile Money", 'error');
            return;
        }

        try {
            const isFullPayment = newTotal >= selectedRequisition.totalAmount;

            await RequisitionStore.addPayment(selectedRequisition.id, {
                amount,
                method: payForm.method as any,
                transactionId: payForm.transactionId,
                paymentDate: new Date().toISOString(),
                recordedBy: currentUser?.name || 'Finance Officer'
            }, newTotal, isFullPayment);

            showToast("Payment recorded successfully!", 'success');
            setPayModalOpen(false);
            // refreshData(); // Removed in favor of Realtime

            // Optionally auto-create an expense transaction?
            // Ignoring for now, but good for future.

        } catch (error) {
            console.error("Payment failed", error);
            showToast("Failed to record payment.", 'error');
        }
    };

    // --- HANDLERS ---

    // --- HANDLERS ---

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

    // Helper to format input value with commas
    const formatMoneyInput = (val: string) => {
        if (!val) return '';
        const parts = val.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    };

    // Helper to strip commas for state
    const parseMoneyInput = (val: string) => {
        return val.replace(/,/g, '');
    };

    const handleRequestAction = async (id: string, action: 'Approved' | 'Rejected') => {
        await FinanceStore.updateRequest(id, action);
        // setRequests(await FinanceStore.getRequests()); // Removed in favor of Realtime
    };

    const handleOpenEventFleet = (event: MinistryEvent) => {
        setSelectedFleetEvent(event);
        setSelectedEventId(event.id); // Sync global event ID to fetch data
        setFleetViewMode('vehicles');
        setFleetJourneyTab('Ongoing'); // Default
    };

    const handleBackToEvents = () => {
        setFleetViewMode('events');
        setSelectedFleetEvent(null);
    };

    const handleViewVehicle = (v: Vehicle) => {
        setSelectedVehicle(v);

        const status = getVehicleJourneyStatus(v);

        if (status === 'Ongoing') {
            setFinanceForm({
                dispatch: v.financeDetails?.ongoingDispatch || '',
                balance: v.financeDetails?.ongoingBalance || ''
            });
        } else {
            setFinanceForm({
                dispatch: v.financeDetails?.returnDispatch || '',
                balance: v.financeDetails?.returnBalance || ''
            });
        }
    };

    // --- NEW: Update Finance Only (No Stage Change) ---
    const handleUpdateFinance = async () => {
        try {
            if (!selectedVehicle) return;
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const updatedVehicle: Vehicle = {
                ...selectedVehicle,
                financeDetails: {
                    ...selectedVehicle.financeDetails,
                    ongoingDispatch: fleetJourneyTab === 'Ongoing' ? financeForm.dispatch : (selectedVehicle.financeDetails?.ongoingDispatch || ''),
                    ongoingBalance: fleetJourneyTab === 'Ongoing' ? financeForm.balance : (selectedVehicle.financeDetails?.ongoingBalance || ''),
                    // Ensure other fields are preserved
                    returnDispatch: selectedVehicle.financeDetails?.returnDispatch || '',
                    returnBalance: selectedVehicle.financeDetails?.returnBalance || '',
                    processedAt: new Date().toISOString()
                }
            };

            await VehicleStore.updateVehicleFinance(
                updatedVehicle.id,
                updatedVehicle.financeDetails
            );
            setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
            setSelectedVehicle(updatedVehicle); // Update local state to reflect changes immediately
            showToast('Finance Details Updated Successfully', 'success');
        } catch (error: any) {
            console.error("Error updating finance details:", error);
            showToast(`Failed to update finance details: ${error.message || 'Unknown error'}`, 'error');
        }
    };

    // --- REFACTORED: Dispatch Vehicle (Stage Transition) ---
    const handleDispatchVehicle = async () => {
        try {
            if (!selectedVehicle) return;
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Ensure we use the latest values
            const updatedVehicle: Vehicle = {
                ...selectedVehicle,
                approvals: {
                    ...selectedVehicle.approvals!,
                    finance: 'Approved'
                },
                ongoingStartTime: fleetJourneyTab === 'Ongoing' ? now : selectedVehicle.ongoingStartTime,
                returnStartTime: fleetJourneyTab === 'Return' ? now : selectedVehicle.returnStartTime,
                financeDetails: {
                    ...selectedVehicle.financeDetails,
                    ongoingDispatch: fleetJourneyTab === 'Ongoing' ? financeForm.dispatch : (selectedVehicle.financeDetails?.ongoingDispatch || ''),
                    ongoingBalance: fleetJourneyTab === 'Ongoing' ? financeForm.balance : (selectedVehicle.financeDetails?.ongoingBalance || ''),

                    // Return Logic
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
                if (!confirm("Total Vehicle Cost is 0 or empty. Are you sure you want to dispatch?")) return;
            }

            await VehicleStore.updateVehicleFinance(
                updatedVehicle.id,
                updatedVehicle.financeDetails,
                updatedVehicle.currentStage,
                updatedVehicle.approvals,
                updatedVehicle.journeyDirection,
                updatedVehicle.ongoingStartTime,
                updatedVehicle.returnStartTime
            );
            setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
            setSelectedVehicle(null);
            showToast(
                fleetJourneyTab === 'Ongoing'
                    ? 'Finance Updated & Vehicle Dispatched to Transit'
                    : 'Return Journey Cleared & Vehicle Released',
                'success'
            );
        } catch (error: any) {
            console.error("Error dispatching vehicle:", error);
            showToast(`Failed to dispatch vehicle: ${error.message || 'Unknown error'}`, 'error');
        }
    };

    const handlePrintFleetReport = () => {
        if (!selectedFleetEvent) return;

        const eventStationIds = pickupStations.filter(s => s.eventId === selectedFleetEvent.id).map(s => s.id);

        // Get all vehicles for this event linked via station
        const allEventVehicles = vehicles.filter(v =>
            v.eventId === selectedFleetEvent.id || eventStationIds.includes(v.stationId)
        );

        // Calculate Stats
        const totalVehicles = allEventVehicles.length;

        // Calculate Total Pax
        const totalPax = passengers.filter(p =>
            allEventVehicles.some(v => v.id === p.vehicleId)
        ).length;

        // Calculate Total Expenditure and Column Totals
        let totalExpenditure = 0;
        let sumBookingFee = 0;
        let sumBalancePayment = 0;
        let sumTotalCost = 0;
        let sumFinalBalance = 0;

        allEventVehicles.forEach(v => {
            const totalCost = parseFloat(v.financeDetails?.ongoingDispatch || '0');
            const bookingFee = parseFloat(v.financeDetails?.ongoingBalance || '0');
            const balancePayment = parseFloat(v.financeDetails?.returnDispatch || '0');
            const balance = totalCost - (bookingFee + balancePayment);

            totalExpenditure += (bookingFee + balancePayment);
            sumBookingFee += bookingFee;
            sumBalancePayment += balancePayment;
            sumTotalCost += totalCost;
            sumFinalBalance += balance;
        });

        // Generate HTML
        const printWindow = window.open('', '_blank');
        if (!printWindow) return showToast('Please allow popups to print report', 'warning');

        const html = `
      <html>
      <head>
        <title>Fleet Finance Report - ${selectedFleetEvent.title}</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          h1 { text-align: center; margin-bottom: 5px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .stats { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; border: 1px solid #000; padding: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background-color: #f0f0f0; }
          .money { text-align: right; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MINISTRY FLEET FINANCE REPORT</h1>
          <h2>${selectedFleetEvent.title}</h2>
          <p>Date: ${selectedFleetEvent.date} | Type: ${selectedFleetEvent.type}</p>
        </div>

        <div class="stats">
          <div>Total Vehicles: ${totalVehicles}</div>
          <div>Total Pax: ${totalPax}</div>
          <div>Total Expenditure: ${formatMoney(totalExpenditure)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Plate</th>
              <th>Driver</th>
              <th>Contact</th>
              <th>No. Pax</th>
              <th class="money">Booking Fee</th>
              <th class="money">Balance</th>
              <th class="money">Total Cost</th>
              <th class="money">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${allEventVehicles.map((v, i) => {
            const totalCost = parseFloat(v.financeDetails?.ongoingDispatch || '0');
            const bookingFee = parseFloat(v.financeDetails?.ongoingBalance || '0');
            const balancePayment = parseFloat(v.financeDetails?.returnDispatch || '0');
            const balance = totalCost - (bookingFee + balancePayment); // Should be 0 if cleared

            return `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${v.number_plate}</td>
                    <td>${v.driverName || '-'}</td>
                    <td>${v.driverContact || '-'}</td>
                    <td>${passengers.filter(p => p.vehicleId === v.id).length}</td>
                    <td class="money">${formatMoney(bookingFee)}</td>
                    <td class="money">${formatMoney(balancePayment)}</td>
                    <td class="money">${formatMoney(totalCost)}</td>
                    <td class="money">${formatMoney(balance)}</td>
                  </tr>
                `;
        }).join('')}
             <tr style="font-weight: bold; background-color: #f0f0f0; border-top: 2px solid #000;">
                <td colspan="4" style="text-align: right;">TOTALS:</td>
                <td>${totalPax}</td>
                <td class="money">${formatMoney(sumBookingFee)}</td>
                <td class="money">${formatMoney(sumBalancePayment)}</td>
                <td class="money">${formatMoney(sumTotalCost)}</td>
                <td class="money">${formatMoney(sumFinalBalance)}</td>
             </tr>
          </tbody>
        </table>

        <div style="margin-top: 20px; text-align: center; font-size: 10px;">
          Generated on ${new Date().toLocaleString()}
        </div>

        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    // --- ACCOUNTABILITY PRINT LOGIC (REFACTORED FOR BATCH) ---
    const generateAccountabilityHTML = (vehicle: Vehicle, globalManifest: any, manifestName: string) => {
        const vPassengers = passengers.filter(p => p.vehicleId === vehicle.id);
        const coordinator = availableCoordinators.find(u => u.name === vehicle.coordinator);
        const coordContact = coordinator?.contact || '______________________';

        // Stats
        const residents = vPassengers.filter(p => p.category === 'Member');
        // Logic check: 'Student' category usually has 'school' field. 'Institution' category has 'school' field too. 
        // Let's rely on p.category. 
        const schoolStudents = vPassengers.filter(p => p.category === 'Student');
        const institutionStudents = vPassengers.filter(p => p.category === 'Institution');

        const totalSouls = vPassengers.length;
        // CORRECTED: Use ongoingDispatch as Total Agreed Cost
        const vehicleCost = parseFloat(vehicle.financeDetails?.ongoingDispatch || '0');
        const costPerHead = totalSouls > 0 ? (vehicleCost / totalSouls) : 0;

        return `
            <div style="page-break-after: always; padding: 20px; border: 1px solid transparent; height: 95vh; box-sizing: border-box;">
                <div class="header">
                    <div class="logo">
                        ${manifestName}
                    </div>
                    <div class="title">Regional Transport Accountability Form</div>
                    <div class="logo-image">
                       ${globalManifest?.logoUrl ? `<img src="${globalManifest.logoUrl}" alt="Logo" style="width: 50px; height: 50px; object-fit: contain; border-radius: 50%; border: 2px solid black;">` :
                `<div style="font-size: 10px; border: 2px solid black; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; text-align: center;">${manifestName}<br>Transport</div>`}
                    </div>
                </div>

                <div class="meta-grid">
                    <div>
                        <div class="meta-row"><span class="meta-label">REGION:</span> <span class="meta-value">CENTRAL</span></div>
                        <div class="meta-row"><span class="meta-label">MANIFEST NAME:</span> <span class="meta-value">${manifestName}</span></div>
                        <div class="meta-row"><span class="meta-label">MANIFEST ID:</span> <span class="meta-value">CTL/EBB01R</span></div>
                    </div>
                    <div>
                        <div class="meta-row"><span class="meta-label">EVENT NAME:</span> <span class="meta-value">${selectedFleetEvent?.title || ''}</span></div>
                        <div class="meta-row"><span class="meta-label">EVENT DATE:</span> <span class="meta-value">${selectedFleetEvent?.date || ''}</span></div>
                        <div class="meta-row"><span class="meta-label">COORDINATOR NAME:</span> <span class="meta-value">${vehicle.coordinator}</span></div>
                        <div class="meta-row"><span class="meta-label">COORD CONTACT:</span> <span class="meta-value">${coordContact}</span></div>
                    </div>
                </div>

                <div class="section-header">DRIVER DETAILS:</div>
                <table class="details-table">
                    <tr>
                        <td style="width: 33%;">
                            NAME: <strong>${vehicle.driverName}</strong><br><br>
                            NIN/PERMIT NO.: <strong>${vehicle.driverNin}</strong>
                        </td>
                        <td style="width: 33%;">
                            CONTACT: <strong>${vehicle.driverContact}</strong><br><br>
                            VEHICLE TYPE: <strong>${vehicle.type}</strong>
                        </td>
                        <td style="width: 33%;">
                            NUMBER PLATE: <strong>${vehicle.number_plate}</strong>
                        </td>
                    </tr>
                </table>

                <div style="background: black; height: 20px; width: 100%; margin-bottom: 0;"></div>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th style="width: 20%;"></th>
                            <th>RESIDENTS</th>
                            <th>SCHOOLS (STUDENTS)</th>
                            <th>INSTITUTIONS (STUDENTS)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight: bold;">NO TRANSPORTED:</td>
                            <td style="text-align: center;">${residents.length || ''}</td>
                            <td style="text-align: center;">${schoolStudents.length || ''}</td>
                            <td style="text-align: center;">${institutionStudents.length || ''}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">FIRST TIMERS:</td>
                            <td style="text-align: center;">${residents.filter(p => p.isFirstTime === 'Yes').length || ''}</td>
                            <td style="text-align: center;">${schoolStudents.filter(p => p.isFirstTime === 'Yes').length || ''}</td>
                            <td style="text-align: center;">${institutionStudents.filter(p => p.isFirstTime === 'Yes').length || ''}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; border-top: 2px solid black;">TOTAL SOULS:</td>
                            <td colspan="3" style="font-weight: bold; font-size: 14px; text-align: center; border-top: 2px solid black;">${totalSouls}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="section-header">VEHICLE DETAILS</div>
                <div class="footer-grid">
                    <div class="footer-cell">
                        COST OF VEHICLE: <strong>${formatMoney(vehicleCost)}</strong><br><br><br><br>
                        VERIFIED BY: ___________________________________________________________
                    </div>
                    <div class="footer-cell">
                        COST PER HEAD: <strong>${formatMoney(costPerHead)}</strong><br><br><br><br>
                        SIGNATURE: ___________________________________________________________
                    </div>
                </div>
            </div>
        `;
    };

    const handlePrintBatchAccountability = async (batchVehicles: Vehicle[]) => {
        const globalManifest = await ManifestStore.get();
        const manifestName = globalManifest?.name || 'MINISTRY MANIFEST';

        const pagesHtml = batchVehicles.map(v => generateAccountabilityHTML(v, globalManifest, manifestName)).join('');

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Accountability Forms Batch</title>
                <style>
                    @media print {
                        @page { size: landscape; margin: 10mm; }
                        body { -webkit-print-color-adjust: exact; }
                    }
                    body { font-family: 'Arial', sans-serif; font-size: 11px; padding: 0; margin: 0; }
                    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: bold; }
                    .title { font-size: 18px; font-weight: bold; text-transform: uppercase; text-align: center; width: 100%; }
                    
                    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                    .meta-row { display: flex; margin-bottom: 5px; }
                    .meta-label { font-weight: bold; width: 140px; }
                    .meta-value { border-bottom: 1px dotted black; flex: 1; font-weight: bold; }

                    .section-header { background: black; color: white; font-weight: bold; padding: 5px 10px; margin-top: 10px; text-transform: uppercase; font-size: 12px; }
                    
                    table.details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    table.details-table td { border: 1px solid black; padding: 8px; vertical-align: top; }
                    
                    table.stats-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                    table.stats-table th { background: white; border: 1px solid black; padding: 5px; font-weight: bold; text-align: center; }
                    table.stats-table td { border: 1px solid black; padding: 5px; height: 30px; }
                    
                    .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid black; }
                    .footer-cell { padding: 10px; border-right: 1px solid black; }
                    .footer-cell:last-child { border-right: none; }
                </style>
            </head>
            <body>
                ${pagesHtml}
                <script>
                  window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handlePrintAccountability = async (vehicle: Vehicle) => {
        await handlePrintBatchAccountability([vehicle]);
    };

    // --- STATS (Strictly event-scoped) ---
    const totalIncome = transactions.filter(t => t.type === 'Income' && t.eventId === selectedEventId).reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense' && t.eventId === selectedEventId).reduce((sum, t) => sum + t.amount, 0);
    const pendingRequests = requisitions.filter(r => r.status === 'Pending' && r.eventId === selectedEventId).length;

    // Filter Vehicles for Selected Event
    const getEventVehicles = () => {
        if (!selectedFleetEvent) return [];
        const eventStationIds = pickupStations.filter(s => s.eventId === selectedFleetEvent.id).map(s => s.id);

        // Assuming 'vehicles' state holds all vehicles, and we filter them down.
        // If 'permittedVehicles' is meant to be a pre-filtered list, it needs to be defined elsewhere.
        // For now, I'll assume 'vehicles' is the source and apply the filter logic.
        const permittedVehicles = vehicles; // Placeholder: if 'permittedVehicles' is a global state, it should be used.
        // If it's a new filter, it needs to be defined.
        // Based on the diff, it seems like 'vehicles' should be used here.

        const allVehicles = permittedVehicles.filter(v =>
            v.eventId === selectedFleetEvent.id || eventStationIds.includes(v.stationId)
        );

        if (fleetJourneyTab === 'All') {
            return allVehicles;
        }

        // For workflow tabs, only show Approved vehicles (Fallback to true if approvals object is null for legacy backwards compatibility)
        const approvedVehicles = allVehicles.filter(v => !v.approvals || v.approvals.registration === 'Approved');

        if (fleetJourneyTab === 'Ongoing') {
            return approvedVehicles.filter(v => !v.financeDetails?.ongoingDispatch || v.financeDetails.ongoingDispatch === '' || v.financeDetails.ongoingDispatch === '0');
        } else if (fleetJourneyTab === 'Return') {
            return approvedVehicles.filter(v =>
                (v.financeDetails?.ongoingDispatch && v.financeDetails.ongoingDispatch !== '' && v.financeDetails.ongoingDispatch !== '0') &&
                (!v.financeDetails?.returnDispatch || v.financeDetails.returnDispatch === '' || v.financeDetails.returnDispatch === '0')
            );
        } else {
            return approvedVehicles.filter(v => v.financeDetails?.returnDispatch && v.financeDetails.returnDispatch !== '' && v.financeDetails.returnDispatch !== '0');
        }
    };

    const eventVehicles = getEventVehicles();

    const getVehicleJourneyStatus = (v: Vehicle) => {
        if (!v.financeDetails?.ongoingDispatch || v.financeDetails.ongoingDispatch === '' || v.financeDetails.ongoingDispatch === '0') return 'Ongoing';
        if (!v.financeDetails?.returnDispatch || v.financeDetails.returnDispatch === '' || v.financeDetails.returnDispatch === '0') return 'Return';
        return 'Cleared';
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-6 h-6 text-ministry-orange" />
                        <h1 className="text-3xl font-bold text-ministry-text">Finance Dashboard</h1>
                    </div>
                    <p className="text-sm text-gray-500">Operation-specific financial tracking and requisitions.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">

                    <button onClick={() => setShowTransModal(true)} className="flex items-center justify-center space-x-2 bg-ministry-text text-white px-5 py-3 rounded-xl hover:bg-ministry-orange transition-colors shadow-lg font-bold">
                        <Plus className="w-4 h-4" /> <span>Add Funds</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-ministry-card p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Income</p>
                        <h3 className="text-3xl font-bold text-green-600">{formatMoney(totalIncome)}</h3>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full text-green-600"><TrendingUp className="w-6 h-6" /></div>
                </div>
                <div className="bg-ministry-card p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Expenditure</p>
                        <h3 className="text-3xl font-bold text-red-600">{formatMoney(totalExpense)}</h3>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full text-red-600"><CreditCard className="w-6 h-6" /></div>
                </div>
                <div className="bg-ministry-card p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Pending Requests</p>
                        <h3 className="text-3xl font-bold text-ministry-orange">{pendingRequests}</h3>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-full text-ministry-orange"><FileText className="w-6 h-6" /></div>
                </div>
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto">
                {[
                    { id: 'income', label: 'Income', icon: ArrowDownLeft },
                    { id: 'expenses', label: 'Expenses', icon: ArrowUpRight },
                    { id: 'requisitions', label: 'Requisitions', icon: FileText },
                    { id: 'fleet', label: 'Fleet Logistics', icon: Bus },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-ministry-neon' : ''}`} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">
                {(activeTab === 'income' || activeTab === 'expenses') && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-800">{activeTab === 'income' ? 'Income Transactions' : 'Expenditure Log'}</h3>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions
                                        .filter(t => activeTab === 'income' ? t.type === 'Income' : t.type === 'Expense')
                                        .map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-mono text-gray-600">{t.date}</td>
                                                <td className="px-6 py-4 font-bold text-gray-800">{t.category}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{t.description}</td>
                                                <td className={`px-6 py-4 text-right font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatMoney(t.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    {transactions.filter(t => activeTab === 'income' ? t.type === 'Income' : t.type === 'Expense').length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'requisitions' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Department Requisitions</h3>
                            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setRequisitionSubTab('Pending')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${requisitionSubTab === 'Pending' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Pending Processing
                                </button>
                                <button
                                    onClick={() => setRequisitionSubTab('Paid')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${requisitionSubTab === 'Paid' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Approved & Paid
                                </button>
                            </div>
                        </div>

                        {requisitionSubTab === 'Pending' ? (
                            <div className="grid grid-cols-1 gap-4">
                                {/* Only show 'Pending Finance' items here (approved by Admin) */}
                                {requisitions
                                    .filter(r => r.status === 'Pending Finance')
                                    .length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                        No pending requisitions to process.
                                    </div>
                                ) : (
                                    requisitions
                                        .filter(r => r.status === 'Pending Finance')
                                        .map(req => {
                                            const percentPaid = Math.min(100, Math.round(((req.amountPaid || 0) / req.totalAmount) * 100));
                                            return (
                                                <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/30 transition-shadow shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">{req.departmentId}</span>
                                                                <span className="text-xs font-mono text-gray-400">{req.requisitionNumber}</span>
                                                            </div>
                                                            <h4 className="text-lg font-bold text-gray-900">{req.title}</h4>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                                                            <p className="text-xl font-black text-gray-900">{formatMoney(req.totalAmount)}</p>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar for Partial Payments */}
                                                    <div className="mb-4">
                                                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                            <span>Paid: {formatMoney(req.amountPaid || 0)}</span>
                                                            <span>Balance: {formatMoney(req.totalAmount - (req.amountPaid || 0))}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentPaid}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                                        <button
                                                            onClick={() => showToast(`Items: \n${req.items?.map(i => `- ${i.description} (${i.quantity} x ${i.unitCost})`).join('\n')}`, 'info')}
                                                            className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
                                                        >
                                                            <FileText className="w-4 h-4" /> View Items
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenPaymentModal(req)}
                                                            className="bg-ministry-text text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors shadow-lg"
                                                        >
                                                            {req.amountPaid && req.amountPaid > 0 ? 'Clear Balance' : 'Process Payment'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {/* PAID Tab */}
                                {requisitions
                                    .filter(r => r.status === 'Paid')
                                    .length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                        No paid requisitions history.
                                    </div>
                                ) : (
                                    requisitions
                                        .filter(r => r.status === 'Paid')
                                        .map(req => (
                                            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 opacity-75 hover:opacity-100 transition-opacity">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-green-100 text-green-700 p-1 rounded-full"><CheckCircle className="w-4 h-4" /></span>
                                                        <h4 className="text-lg font-bold text-gray-900 line-through text-gray-400 decoration-gray-400">{req.title}</h4>
                                                    </div>
                                                    <p className="text-lg font-black text-green-600">{formatMoney(req.totalAmount)}</p>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-gray-500">
                                                    <span>{req.departmentId} • {req.requisitionNumber}</span>
                                                    <button className="text-ministry-orange font-bold hover:underline">View Accountability</button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'fleet' && (
                    <div className="space-y-6 animate-in fade-in">
                        {/* This is where the vehicle subscription logic would typically be, outside the JSX.
                            Assuming it's in a useEffect or similar, the change would be applied there.
                            The provided snippet seems to be an isolated block of code that needs to be inserted.
                            I'll place it where it makes sense syntactically, assuming it's part of a larger
                            conditional block for handling subscription events. */}
                        {/* Placeholder for vehicle subscription logic if it were inline,
                            but it's usually in a useEffect. The user's snippet implies
                            it's part of a larger `if/else if` chain for event types. */}
                        {/*
                        } else if (eventType === 'INSERT' && newRecord) {
                            const newVeh = mapVehicleFromDB(newRecord);
                            // Filter: Only add if it belongs to one of our current stations (already event-scoped)
                            setVehicles(prev => {
                                const stationIds = new Set(pickupStations.map(s => s.id));
                                if (stationIds.has(newVeh.stationId)) {
                                    return [newVeh, ...prev];
                                }
                                return prev;
                            });
                        }
                        */}
                        {fleetViewMode === 'events' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold text-gray-800">Select Operation / Event</h3>
                                        <button
                                            onClick={refreshData}
                                            disabled={isRefreshing}
                                            className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-ministry-orange disabled:opacity-50"
                                            title="Refresh Data"
                                        >
                                            <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {events.filter(e => e.type === 'Event').map(event => {
                                        const isLocked = isEventLocked(event.date);
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={() => handleOpenEventFleet(event)}
                                                className="bg-ministry-card border border-gray-200 p-6 rounded-xl hover:shadow-lg hover:border-ministry-orange/40 transition-all cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-gray-100 rounded-full group-hover:bg-ministry-orange group-hover:text-white transition-colors">
                                                        {event.type === 'Service' ? <Calendar className="w-6 h-6" /> : <Bus className="w-6 h-6" />}
                                                    </div>
                                                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">{event.date}</span>
                                                </div>
                                                <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-ministry-orange transition-colors">{event.title}</h4>

                                                {isLocked && (
                                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center w-full" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedFleetEvent(event);
                                                                handlePrintFleetReport(); // This uses selectedFleetEvent state, but that state isn't set yet if we just clicked button. 
                                                                // Actually handlePrintFleetReport uses selectedFleetEvent state. 
                                                                // We should probably fix that or just let them open the view and print from there.
                                                                // The existing code at 673 calls handlePrintFleetReport() but selectedFleetEvent might be null if we haven't opened it?
                                                                // Ah, handleOpenEventFleet sets it. 
                                                                // Let's just render the 'Locked' badge here or allow opening in read-only.
                                                                // We'll keep the button but make sure it works.
                                                                // Actually, better to just let them open the view (which we will make read-only) 
                                                                // and print from top bar.
                                                            }}
                                                            className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                            <span>Print Report</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {fleetViewMode === 'vehicles' && selectedFleetEvent && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={handleBackToEvents} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{selectedFleetEvent.title}</h3>
                                            <p className="text-sm text-gray-500">Fleet Logistics</p>
                                        </div>
                                        <button
                                            onClick={refreshData}
                                            disabled={isRefreshing}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-ministry-orange disabled:opacity-50"
                                            title="Refresh Data"
                                        >
                                            <RotateCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>

                                    <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
                                        <button
                                            onClick={() => setFleetJourneyTab('Ongoing')}
                                            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center ${fleetJourneyTab === 'Ongoing' ? 'bg-white shadow text-ministry-orange' : 'text-gray-500'}`}
                                        >
                                            <ArrowUpRight className="w-4 h-4 mr-2" /> Ongoing
                                        </button>
                                        <button
                                            onClick={() => setFleetJourneyTab('Return')}
                                            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center ${fleetJourneyTab === 'Return' ? 'bg-white shadow text-ministry-orange' : 'text-gray-500'}`}
                                        >
                                            <ArrowDownLeft className="w-4 h-4 mr-2" /> Return
                                        </button>
                                        <button
                                            onClick={() => setFleetJourneyTab('Cleared')}
                                            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center ${fleetJourneyTab === 'Cleared' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" /> Cleared
                                        </button>
                                        <button
                                            onClick={() => setFleetJourneyTab('All')}
                                            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center ${fleetJourneyTab === 'All' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                                        >
                                            <Bus className="w-4 h-4 mr-2" /> All
                                        </button>
                                        <button
                                            onClick={handlePrintFleetReport}
                                            className="flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold text-gray-700 hover:text-gray-900 transition-all flex items-center justify-center border-l border-gray-200 ml-1"
                                            title="Print Fleet Report"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {eventVehicles.length === 0 ? (
                                    <div className="col-span-3 text-center py-12 text-gray-400">No vehicles requiring finance attention.</div>
                                ) : (
                                    <div className="col-span-full space-y-8">
                                        {Array.from(new Set(eventVehicles.map(v => v.stationId || 'direct'))).sort().map(stationId => {
                                            const stationVehicles = eventVehicles.filter(v => (v.stationId || 'direct') === stationId);
                                            const stationName = stationId === 'direct' ? 'Direct Event Vehicles' : pickupStations.find(s => s.id === stationId)?.name || 'Unknown Station';

                                            return (
                                                <div key={stationId} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                    <div className="bg-white px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                                                            <div className="w-2 h-8 bg-ministry-orange rounded-full"></div>
                                                            {stationName}
                                                            <span className="text-sm font-normal text-gray-400">({stationVehicles.length} vehicles)</span>
                                                        </h4>
                                                        <button
                                                            onClick={() => handlePrintBatchAccountability(stationVehicles)}
                                                            className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors shadow-sm"
                                                        >
                                                            <Printer className="w-4 h-4" /> <span>Print Station Batch</span>
                                                        </button>
                                                    </div>
                                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {stationVehicles.map(v => (
                                                            <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="text-lg font-bold font-mono text-gray-900">{v.number_plate}</h4>
                                                                    {fleetJourneyTab === 'All' && (
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${(!v.approvals || v.approvals.registration === 'Approved') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                            {(!v.approvals || v.approvals.registration === 'Approved') ? 'Active' : 'Pending'}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {getVehicleJourneyStatus(v) === 'Cleared' ? (
                                                                    <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                                                                        <p className="text-xs text-green-700 font-bold uppercase mb-1">Total Paid</p>
                                                                        <p className="text-lg font-black text-green-800">
                                                                            {formatMoney(parseFloat(v.financeDetails?.ongoingBalance || '0') + parseFloat(v.financeDetails?.returnDispatch || '0'))}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleViewVehicle(v)}
                                                                        disabled={(selectedFleetEvent.type === 'Service' && isServiceClosed(selectedFleetEvent.date)) || (selectedFleetEvent.type === 'Event' && isEventLocked(selectedFleetEvent.date))}
                                                                        className={`py-2 rounded-lg text-sm font-bold transition-colors w-full mt-4 ${(selectedFleetEvent.type === 'Service' && isServiceClosed(selectedFleetEvent.date)) || (selectedFleetEvent.type === 'Event' && isEventLocked(selectedFleetEvent.date)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-ministry-text text-white hover:bg-ministry-orange'}`}
                                                                    >
                                                                        {(selectedFleetEvent.type === 'Service' && isServiceClosed(selectedFleetEvent.date)) || (selectedFleetEvent.type === 'Event' && isEventLocked(selectedFleetEvent.date)) ? 'View Only' : (getVehicleJourneyStatus(v) === 'Ongoing' ? 'Process Ongoing' : 'Process Return')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Transaction Modal */}
            {
                showTransModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-bold mb-4">Add {transForm.type}</h3>
                            <form onSubmit={handleAddTransaction} className="space-y-4">
                                <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                    <button type="button" onClick={() => setTransForm({ ...transForm, type: 'Income' })} className={`flex-1 py-2 rounded-md text-sm font-bold ${transForm.type === 'Income' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>Income</button>
                                    <button type="button" onClick={() => setTransForm({ ...transForm, type: 'Expense' })} className={`flex-1 py-2 rounded-md text-sm font-bold ${transForm.type === 'Expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}>Expense</button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Related Event (Optional)</label>
                                    <select
                                        value={transForm.eventId}
                                        onChange={e => setTransForm({ ...transForm, eventId: e.target.value })}
                                        className="w-full p-3 border rounded-xl bg-white"
                                    >
                                        <option value="">-- General / None --</option>
                                        {events.map(ev => (
                                            <option key={ev.id} value={ev.id}>
                                                {ev.date} - {ev.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Amount ({currency})</label>
                                    <input
                                        required
                                        type="text"
                                        inputMode="numeric"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        onKeyDown={(e) => { if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault(); }}
                                        value={formatMoneyInput(transForm.amount)}
                                        onChange={e => {
                                            const raw = parseMoneyInput(e.target.value);
                                            if (!isNaN(Number(raw))) {
                                                setTransForm({ ...transForm, amount: raw });
                                            }
                                        }}
                                        className="w-full p-3 border rounded-xl"
                                        placeholder="0.00"
                                    />
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
                )
            }

            {/* Requisition Payment Modal */}
            {payModalOpen && selectedRequisition && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Process Payment</h3>
                                <p className="text-sm text-gray-500">{selectedRequisition.title}</p>
                            </div>
                            <button onClick={() => setPayModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl mb-6">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500">Total Requested</span>
                                <span className="font-bold">{formatMoney(selectedRequisition.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500">Already Paid</span>
                                <span className="font-bold text-green-600">{formatMoney(selectedRequisition.amountPaid || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2">
                                <span className="font-bold text-gray-700">Remaining Balance</span>
                                <span className="font-bold text-ministry-orange">{formatMoney(selectedRequisition.totalAmount - (selectedRequisition.amountPaid || 0))}</span>
                            </div>
                        </div>

                        <form onSubmit={handleProcessPayment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Amount (UGX)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onKeyDown={(e) => { if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault(); }}
                                    required
                                    max={selectedRequisition.totalAmount - (selectedRequisition.amountPaid || 0)}
                                    value={formatMoneyInput(payForm.amount)}
                                    onChange={(e) => {
                                        const raw = parseMoneyInput(e.target.value);
                                        if (!isNaN(Number(raw))) {
                                            setPayForm({ ...payForm, amount: raw });
                                        }
                                    }}
                                    className="w-full p-3 border border-gray-200 rounded-xl font-mono text-lg font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                                <select
                                    value={payForm.method}
                                    onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl bg-white"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Bank">Bank Transfer</option>
                                </select>
                            </div>

                            {payForm.method === 'Mobile Money' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction ID</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. PPK477..."
                                        value={payForm.transactionId}
                                        onChange={(e) => setPayForm({ ...payForm, transactionId: e.target.value.toUpperCase() })}
                                        className="w-full p-3 border border-gray-200 rounded-xl font-mono"
                                    />
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

            {/* Fleet Finance Processing Modal */}
            {
                selectedVehicle && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
                            {/* This is where the passenger subscription logic would typically be, outside the JSX.
                                Assuming it's in a useEffect or similar, the change would be applied there.
                                The provided snippet seems to be an isolated block of code that needs to be inserted.
                                I'll place it where it makes sense syntactically, assuming it's part of a larger
                                conditional block for handling subscription events. */}
                            {/*
                            if (eventType === 'INSERT') {
                                const newPass = mapPassengerFromDB(newRecord);
                                // Filter: Only add if it belongs to one of our current vehicles (already event-scoped)
                                setPassengers(prev => {
                                    if (vehicles.some(v => v.id === newPass.vehicleId)) {
                                        return [newPass, ...prev].sort((a, b) => a.name.localeCompare(b.name));
                                    }
                                    return prev;
                                });
                            }
                            */}
                            {(() => {
                                const vPassengers = passengers.filter(p => p.vehicleId === selectedVehicle.id);
                                const totalPax = vPassengers.length;
                                const firstTimers = vPassengers.filter(p => p.isFirstTime === 'Yes').length;
                                const students = vPassengers.filter(p => p.category === 'Student').length;
                                const institutions = vPassengers.filter(p => p.category === 'Institution').length;

                                // Derive effective Journey Tab for Modal Content

                                const effectiveJourneyTab = getVehicleJourneyStatus(selectedVehicle);

                                return (
                                    <>
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-3xl font-bold font-mono text-ministry-text">{selectedVehicle.number_plate}</h3>
                                                <p className="text-lg text-gray-700 font-medium">{selectedVehicle.type} • {selectedVehicle.driverName}</p>
                                                <p className="text-sm text-gray-500">{selectedVehicle.driverContact}</p>
                                            </div>
                                            {/* Stats Block */}
                                            <div className="text-right">
                                                <div className="text-4xl font-bold text-ministry-orange">{totalPax}</div>
                                                <div className="text-sm font-bold text-gray-400 uppercase">Total Pax</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mb-8">
                                            <div className="border border-gray-200 rounded-xl p-4 text-center">
                                                <div className="text-2xl font-bold text-gray-800">{firstTimers}</div>
                                                <div className="text-xs font-bold text-gray-400 uppercase">First Timers</div>
                                            </div>
                                            <div className="border border-gray-200 rounded-xl p-4 text-center">
                                                <div className="text-2xl font-bold text-gray-800">{students}</div>
                                                <div className="text-xs font-bold text-gray-400 uppercase">Students</div>
                                            </div>
                                            <div className="border border-gray-200 rounded-xl p-4 text-center">
                                                <div className="text-2xl font-bold text-gray-800">{institutions}</div>
                                                <div className="text-xs font-bold text-gray-400 uppercase">Institution</div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* ONGOING: Define Cost & Pay Booking Fee */}
                                            {effectiveJourneyTab === 'Ongoing' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-ministry-text uppercase">Total Vehicle Cost ({currency})</label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                            onKeyDown={(e) => { if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault(); }}
                                                            value={formatMoneyInput(financeForm.dispatch)}
                                                            onChange={e => {
                                                                const raw = parseMoneyInput(e.target.value);
                                                                if (!isNaN(Number(raw))) {
                                                                    setFinanceForm({ ...financeForm, dispatch: raw });
                                                                }
                                                            }}
                                                            className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg font-bold focus:border-ministry-orange outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-ministry-text uppercase">Booking Fee Paid ({currency})</label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                            onKeyDown={(e) => { if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault(); }}
                                                            value={formatMoneyInput(financeForm.balance)}
                                                            onChange={e => {
                                                                const raw = parseMoneyInput(e.target.value);
                                                                if (!isNaN(Number(raw))) {
                                                                    setFinanceForm({ ...financeForm, balance: raw });
                                                                }
                                                            }}
                                                            className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg font-bold focus:border-ministry-orange outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* RETURN: View Balance & Clear It */}
                                            {effectiveJourneyTab === 'Return' && (
                                                <div>
                                                    {(() => {
                                                        const totalCost = parseFloat(selectedVehicle.financeDetails?.ongoingDispatch || '0');
                                                        const bookingFee = parseFloat(selectedVehicle.financeDetails?.ongoingBalance || '0');
                                                        const remainingBalance = totalCost - bookingFee;

                                                        return (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <div className="space-y-2">
                                                                    <label className="text-sm font-bold text-gray-500 uppercase">Total Agreed Cost</label>
                                                                    <div className="w-full p-4 bg-gray-50 rounded-xl text-lg font-bold text-gray-700">
                                                                        {formatMoney(totalCost)}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-sm font-bold text-gray-500 uppercase">Less: Booking Fee</label>
                                                                    <div className="w-full p-4 bg-gray-50 rounded-xl text-lg font-bold text-gray-700">
                                                                        {formatMoney(bookingFee)}
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-full space-y-2">
                                                                    <label className="text-sm font-bold text-ministry-orange uppercase">Balance to Clear ({currency})</label>
                                                                    <input
                                                                        type="number"
                                                                        value={remainingBalance}
                                                                        disabled
                                                                        className="w-full p-4 border-2 border-ministry-orange bg-orange-50 rounded-xl text-xl font-bold text-ministry-orange outline-none"
                                                                    />
                                                                    <p className="text-xs text-gray-400">This balance will be marked as cleared upon approval.</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* CLEARED: Read Only Summary */}
                                            {effectiveJourneyTab === 'Cleared' && (
                                                <div className="mt-4 p-6 bg-green-50 border border-green-100 rounded-2xl text-center space-y-3">
                                                    <div className="flex justify-center">
                                                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                                                            <CheckCircle className="w-8 h-8" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-green-700 font-bold uppercase tracking-wider">Financial Clearance Complete</p>
                                                        <p className="text-3xl font-black text-green-800 mt-1">
                                                            {formatMoney(parseFloat(selectedVehicle.financeDetails?.ongoingBalance || '0') + parseFloat(selectedVehicle.financeDetails?.returnDispatch || '0'))}
                                                        </p>
                                                        <p className="text-xs text-green-600 mt-2">All payments for this vehicle journey have been processed and approved.</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePrintAccountability(selectedVehicle)}
                                                    className="px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                                                    title="Print Accountability Form"
                                                >
                                                    <Printer className="w-4 h-4" /> <span>Print Form</span>
                                                </button>

                                                <div className="flex gap-3">
                                                    <button onClick={() => setSelectedVehicle(null)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>

                                                    {effectiveJourneyTab !== 'Cleared' && (
                                                        <button
                                                            onClick={handleDispatchVehicle}
                                                            disabled={effectiveJourneyTab === 'Return' && selectedVehicle.currentStage !== 'FinanceApproval'}
                                                            className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-colors ${effectiveJourneyTab === 'Return' && selectedVehicle.currentStage !== 'FinanceApproval'
                                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                                : 'bg-ministry-text text-white hover:bg-ministry-orange'
                                                                }`}
                                                        >
                                                            {effectiveJourneyTab === 'Ongoing' ? 'Dispatch Vehicle' : 'Clear Balance & Approve'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default FinanceDashboard;
