/**
 * TransportationLayout
 *
 * Shared data host for the Transportation module.
 * Owns ALL fetching, realtime subscriptions, and mutation handlers
 * previously in the TransportationDashboard monolith.
 *
 * Context + hook live in TransportContext.ts (Vite Fast Refresh separation).
 * Shared types live in types.ts.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useSearchParams } from 'react-router-dom';
import { Navigation, Users, LayoutList } from 'lucide-react';
import { isVehicleCoordinator, isStageCoordinator } from '../../domain/rbac';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { useNotification } from '../../components/ui/NotificationSystem';
import { VehicleStore, mapPassengerFromDB, mapVehicleFromDB } from '../../database/vehicleStore';
import { UserStore, mapUserFromDB } from '../../database/userStore';
import { LogisticsStore } from '../../database/logisticsStore';
import { SoulsStore } from '../../database/soulsStore';
import { OfflineQueue } from '../../services/OfflineQueue';
import { supabase } from '../../services/supabaseClient';
import { v5 as uuidv5, validate as validateUuid } from 'uuid';
import { Vehicle, User, Passenger, JourneyStage, Soul } from '../../types';
import EventDetailsModal from '../../components/EventDetailsModal';
import { TransportContext, TransportContextValue } from './TransportContext';
import {
    TrackedVehicle, TRANSPORT_DEPT_UUID, COGNITO_FORM_URL, PASSENGER_NAMESPACE, toTrackedVehicle
} from './types';

// ─── Layout (pure component) ──────────────────────────────────────────────────

const TransportationLayout: React.FC = () => {
    const { user } = useAuth();
    const { events } = useEvent();
    const { showToast, confirm: askConfirm } = useNotification();
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

    const filteredEvents = events.filter(e => e.type === 'Event');
    const selectedEvent = events.find(e => e.id === selectedEventId);

    // Auto-select first event
    useEffect(() => {
        if (!selectedEventId && filteredEvents.length > 0) {
            if (user?.eventId) {
                const myEvent = filteredEvents.find(e => e.id === user.eventId);
                if (myEvent) { setSelectedEventId(myEvent.id); return; }
            }
            setSelectedEventId(filteredEvents[0].id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredEvents.length, selectedEventId]);

    // ── Role detection ────────────────────────────────────────────────────────
    const isCoordinatorView = isVehicleCoordinator(user);
    const isStageCoord = isStageCoordinator(user);

    // ── Shared data state ─────────────────────────────────────────────────────
    const [vehicles, setVehicles] = useState<TrackedVehicle[]>([]);
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [coordinators, setCoordinators] = useState<User[]>([]);
    const [dbStations, setDbStations] = useState<any[]>([]);
    const [myVehicle, setMyVehicle] = useState<Vehicle | null>(null);

    // ── Admin fleet state ─────────────────────────────────────────────────────
    const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'En Route' | 'Arrived' | 'Completed'>('All');
    const [isAssigning, setIsAssigning] = useState<string | null>(null);
    const [selectedCoordinator, setSelectedCoordinator] = useState('');
    const [adminViewMode, setAdminViewMode] = useState<'list' | 'detail'>('list');
    const [selectedAdminVehicle, setSelectedAdminVehicle] = useState<TrackedVehicle | null>(null);
    const [adminVehiclePassengers, setAdminVehiclePassengers] = useState<Passenger[]>([]);
    const [adminDetailTab, setAdminDetailTab] = useState<'manifest' | 'live' | 'report'>('manifest');
    const [showHighlights, setShowHighlights] = useState(false);

    // ── Coordinator journey state ─────────────────────────────────────────────
    const urlLeg = searchParams.get('leg') as 'Ongoing' | 'Return' | null;
    const [activeJourneyTab, setActiveJourneyTab] = useState<'Ongoing' | 'Return'>(urlLeg || 'Ongoing');
    const [isVehicleOpen, setIsVehicleOpen] = useState(false);
    const [returnPassengerForm, setReturnPassengerForm] = useState({ name: '', contact: '', residence: '' });
    const [submittingStage, setSubmittingStage] = useState<string | null>(null);

    const lastLocationUpdate = useRef(0);
    const isSubmittingRef = useRef(false);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const refreshData = useCallback(async (targetEventId: string = selectedEventId) => {
        const isVehicleCoord = isCoordinatorView && user;
        if (!isVehicleCoord && !targetEventId) {
            setVehicles([]); setPassengers([]); setDbStations([]); return;
        }
        try {
            if (isVehicleCoord) {
                const vehicleRes = await VehicleStore.getVehicles({ coordinatorUid: user!.id, coordinator: user!.name, eventId: targetEventId });
                const fetchedVehicles = vehicleRes.status === 'success' ? vehicleRes.data : [];
                const mine = fetchedVehicles.find(v =>
                    v.coordinatorUid === user!.id ||
                    v.coordinator?.trim().toLowerCase() === user!.name.trim().toLowerCase()
                );
                if (mine) {
                    const updated = { ...mine, currentStage: mine.currentStage || 'Onboarding', journeyDirection: mine.journeyDirection || 'Ongoing', approvals: mine.approvals || { registration: 'Pending', finance: 'Pending' } };
                    setMyVehicle(updated);
                    if (updated.journeyDirection) {
                        setActiveJourneyTab(updated.journeyDirection as any);
                        setSearchParams(prev => { prev.set('leg', updated.journeyDirection!); return prev; }, { replace: true });
                    }
                    const pRes = await VehicleStore.getPassengers(mine.id);
                    setPassengers(pRes.status === 'success' ? pRes.data : []);
                } else {
                    setMyVehicle(null); setPassengers([]);
                }
            } else if (isStageCoord) {
                const [vehicleRes, userRes, passengerRes, stationRes] = await Promise.all([
                    VehicleStore.getVehicles({ eventId: targetEventId }),
                    UserStore.getAll({ eventId: targetEventId }),
                    VehicleStore.getPassengers({ eventId: targetEventId }),
                    LogisticsStore.getStations(targetEventId)
                ]);
                const myStationId = user!.stationId;
                const stations = stationRes.status === 'success' ? stationRes.data : [];
                setDbStations(stations);
                const allVehicles = vehicleRes.status === 'success' ? vehicleRes.data : [];
                const myStationVehicles = allVehicles.filter(v => v.stationId === myStationId);
                const tracked = myStationVehicles.map(toTrackedVehicle);
                setVehicles(tracked);
                const allUsers = userRes.status === 'success' ? userRes.data : [];
                setCoordinators(allUsers.filter(u => {
                    const isRelevantRole = u.role === 'Vehicle Coordinator' || u.role === 'Stage Coordinator';
                    return isRelevantRole && (u.stationId === myStationId || !u.stationId);
                }));
                const allPassengers = passengerRes.status === 'success' ? passengerRes.data : [];
                const myIds = myStationVehicles.map(v => v.id);
                setPassengers(allPassengers.filter(p => myIds.includes(p.vehicleId)));
                const mine = tracked.find(v => v.coordinatorUid === user!.id || v.coordinator?.trim().toLowerCase() === user!.name.trim().toLowerCase());
                setMyVehicle(mine || null);
            } else {
                // HOD view
                const [vehicleRes, stationRes, passengerRes, userRes] = await Promise.all([
                    VehicleStore.getVehicles({ eventId: targetEventId }),
                    LogisticsStore.getStations(targetEventId),
                    VehicleStore.getPassengers({ eventId: targetEventId }),
                    UserStore.getAll({ eventId: targetEventId })
                ]);
                const stations = stationRes.status === 'success' ? stationRes.data : [];
                setDbStations(stations);
                const eventVehicles = vehicleRes.status === 'success' ? vehicleRes.data : [];
                setVehicles(eventVehicles.map(toTrackedVehicle));
                setPassengers(passengerRes.status === 'success' ? passengerRes.data : []);
                let allUsers = userRes.status === 'success' ? userRes.data : [];
                let coords = allUsers.filter(u => ['Vehicle Coordinator', 'Stage Coordinator', 'Coordinator'].includes(u.role));
                const vehicleCoordNames = Array.from(new Set(eventVehicles.map(v => v.coordinator).filter(Boolean)));
                vehicleCoordNames.forEach(name => {
                    if (!coords.find(c => c.name.trim().toLowerCase() === name!.trim().toLowerCase()) && name) {
                        coords.push({ id: `fallback-${name}`, name, username: name.toLowerCase().replace(/\s+/g, ''), role: 'Vehicle Coordinator', departmentId: TRANSPORT_DEPT_UUID, status: 'Active', contact: 'N/A', email: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`, password: '***', stationId: undefined });
                    }
                });
                setCoordinators(coords);
                if (coords.length > 0 && !selectedCoordinator) setSelectedCoordinator(coords[0].name);
            }
        } catch (e) { console.error('[TransportationLayout] refreshData error:', e); }
    }, [selectedEventId, isCoordinatorView, isStageCoord, user, selectedCoordinator]);

    const refreshDataRef = useRef(refreshData);
    refreshDataRef.current = refreshData;

    // ── Realtime + fetch on event change ──────────────────────────────────────
    useEffect(() => {
        if (!selectedEventId) return;
        setVehicles([]); setPassengers([]); setDbStations([]); setCoordinators([]);
        const t = setTimeout(() => refreshDataRef.current(selectedEventId).catch(console.error), 0);

        const channel = supabase
            .channel(`transport-layout-${selectedEventId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: `event_id=eq.${selectedEventId}` }, ({ eventType, new: n, old: o }) => {
                if (eventType === 'INSERT') setVehicles(prev => prev.some(v => v.id === n.id) ? prev : [...prev, toTrackedVehicle(mapVehicleFromDB(n))]);
                else if (eventType === 'UPDATE') {
                    const mapped = mapVehicleFromDB(n);
                    setVehicles(prev => prev.map(v => v.id === n.id ? { ...v, ...Object.fromEntries(Object.entries(mapped).filter(([, val]) => val !== undefined)) } as TrackedVehicle : v));
                    setMyVehicle(prev => prev?.id === n.id ? { ...prev, ...Object.fromEntries(Object.entries(mapped).filter(([, val]) => val !== undefined)) } as Vehicle : prev);
                } else if (eventType === 'DELETE') setVehicles(prev => prev.filter(v => v.id !== o.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, ({ eventType, new: n, old: o }) => {
                const mapped = mapUserFromDB(n);
                const isCoord = ['Vehicle Coordinator', 'Stage Coordinator', 'Coordinator'].includes(mapped.role);
                if (eventType === 'INSERT') {
                    if (!isCoord || (mapped.eventId && mapped.eventId !== selectedEventId)) return;
                    setCoordinators(prev => prev.some(u => u.id === mapped.id) ? prev : [...prev, mapped]);
                } else if (eventType === 'UPDATE') {
                    if (!isCoord) { setCoordinators(prev => prev.filter(u => u.id !== mapped.id)); return; }
                    setCoordinators(prev => {
                        if (prev.some(u => u.id === mapped.id)) return prev.map(u => u.id === mapped.id ? mapped : u);
                        if (!mapped.eventId || mapped.eventId === selectedEventId) return [...prev, mapped];
                        return prev;
                    });
                } else if (eventType === 'DELETE') setCoordinators(prev => prev.filter(u => u.id !== o.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'passengers', filter: `event_id=eq.${selectedEventId}` }, ({ eventType, new: n, old: o }) => {
                if (eventType === 'INSERT') setPassengers(prev => prev.some(p => p.id === n.id) ? prev : [...prev, mapPassengerFromDB(n)]);
                else if (eventType === 'UPDATE') setPassengers(prev => prev.map(p => p.id === n.id ? mapPassengerFromDB(n) : p));
                else if (eventType === 'DELETE') setPassengers(prev => prev.filter(p => p.id !== o.id));
            })
            .subscribe();

        return () => { clearTimeout(t); supabase.removeChannel(channel); };
    }, [selectedEventId]);

    // ── Geolocation for coordinator ───────────────────────────────────────────
    useEffect(() => {
        if (isCoordinatorView && myVehicle) {
            const watchId = navigator.geolocation.watchPosition(
                ({ coords: { latitude, longitude } }) => {
                    const now = Date.now();
                    if (now - lastLocationUpdate.current > 10000) {
                        lastLocationUpdate.current = now;
                        VehicleStore.updateVehicleLocation(myVehicle.id, { lat: latitude, lng: longitude }).catch(console.error);
                    }
                },
                err => console.error('Geolocation:', err.message),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [isCoordinatorView, myVehicle]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleStageUpdate = async (newStage: JourneyStage) => {
        if (!myVehicle || isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setSubmittingStage(newStage);
        try {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let updated = { ...myVehicle, currentStage: newStage };
            if (newStage === 'Transit') {
                if (activeJourneyTab === 'Ongoing' && !updated.ongoingStartTime) updated.ongoingStartTime = now;
                else if (activeJourneyTab === 'Return' && !updated.returnStartTime) updated.returnStartTime = now;
            }
            if (newStage === 'Arrived') {
                if (activeJourneyTab === 'Ongoing') updated.ongoingArrivalTime = now;
                else { updated.returnArrivalTime = now; updated.status = 'Completed'; }
            }
            if (newStage === 'RegApproval') updated.approvals = { ...updated.approvals, registration: 'Pending', finance: 'Pending' };
            if (newStage === 'FinanceApproval') updated.approvals = { ...updated.approvals!, registration: 'Approved', finance: 'Pending' };
            if (newStage === 'Transit') updated.approvals = { ...updated.approvals!, finance: 'Approved', registration: 'Approved' };
            const confirmed = await VehicleStore.updateVehicleStage(updated.id, updated.currentStage, updated.approvals, {
                status: updated.status, ongoingStartTime: updated.ongoingStartTime, returnStartTime: updated.returnStartTime,
                ongoingArrivalTime: updated.ongoingArrivalTime, returnArrivalTime: updated.returnArrivalTime, version: myVehicle.version
            });
            setMyVehicle(confirmed);
            if (newStage === 'Arrived' && activeJourneyTab === 'Ongoing') {
                showToast('Ongoing Journey Completed. Switching to Return...', 'success');
                setTimeout(() => switchJourneyTab('Return', confirmed), 1500);
            }
        } catch (err: any) {
            showToast(err.message || `Failed to transition to ${newStage}`, 'error');
        } finally {
            setSubmittingStage(null);
            isSubmittingRef.current = false;
        }
    };

    const switchJourneyTab = async (tab: 'Ongoing' | 'Return', vehicleOverride?: Vehicle) => {
        const v = vehicleOverride || myVehicle;
        if (!v) return;
        setActiveJourneyTab(tab);
        setSearchParams(prev => { prev.set('leg', tab); return prev; }, { replace: true });
        const updated: Vehicle = { ...v, journeyDirection: tab, currentStage: 'Onboarding' as JourneyStage, approvals: { registration: 'Pending', finance: 'Pending' } };
        if (tab === 'Return') {
            try {
                await VehicleStore.startReturnJourney(updated.id, v.version);
                setPassengers(prev => prev.map(p => ({ ...p, verified: false })));
                setMyVehicle(updated);
            } catch { showToast('Failed to start return journey', 'error'); }
        } else {
            VehicleStore.updateVehicleStage(updated.id, updated.currentStage, updated.approvals, { journeyDirection: updated.journeyDirection });
            setMyVehicle(updated);
        }
    };

    const handleToggleVerify = async (passengerId: string) => {
        const p = passengers.find(p => p.id === passengerId);
        if (!p) return;
        const original = { ...p };
        setPassengers(prev => prev.map(pas => pas.id === passengerId ? { ...pas, verified: !p.verified } : pas));
        try { await VehicleStore.checkinPassenger(p.id, !p.verified); }
        catch {
            setPassengers(prev => prev.map(pas => pas.id === passengerId ? original : pas));
            showToast('Failed to update status', 'error');
        }
    };

    const handleAddReturnPassenger = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myVehicle || !returnPassengerForm.name.trim()) return;
        if (!returnPassengerForm.contact || returnPassengerForm.contact === '256' || returnPassengerForm.contact.length <= 3) {
            if (!(await askConfirm('Missing Contact Info', 'No contact number provided. Are you sure?'))) return;
        }
        const newP: Passenger = {
            id: crypto.randomUUID(), vehicleId: myVehicle.id, eventId: myVehicle.eventId || selectedEventId,
            stationId: myVehicle.stationId, name: returnPassengerForm.name,
            contact: returnPassengerForm.contact, residence: returnPassengerForm.residence,
            category: 'Member', isFirstTime: 'No', verified: true
        };
        VehicleStore.addPassenger(newP);
        setPassengers(prev => [...prev, newP]);
        setReturnPassengerForm({ name: '', contact: '', residence: '' });
    };

    const handleMarkSoulWon = async (passengerId: string) => {
        const p = passengers.find(p => p.id === passengerId);
        if (!p || !myVehicle) return;
        const effectiveEventId = myVehicle.eventId || selectedEventId;
        if (!effectiveEventId) { showToast('Could not link to an active event', 'error'); return; }
        const newStatus = !p.soulWon;
        setPassengers(passengers.map(pas => pas.id === passengerId ? { ...pas, soulWon: newStatus } : pas));
        await VehicleStore.updatePassenger({ id: p.id, soulWon: newStatus });
        let soulId = p.id;
        if (!validateUuid(p.id)) soulId = uuidv5(p.id, PASSENGER_NAMESPACE);
        if (newStatus) {
            const nameParts = p.name.split(' ');
            const activeEventObj = events.find(e => e.id === effectiveEventId);
            const newSoul: Soul = {
                id: soulId, firstName: nameParts[0], lastName: nameParts.slice(1).join(' ') || 'Unknown',
                phone: p.contact, gender: p.gender || 'Male', residence: p.residence, status: 'New',
                sourceType: activeEventObj?.type || 'Service', sourceId: effectiveEventId,
                capturedBy: user?.id || '00000000-0000-0000-0000-000000000000',
                createdAt: new Date().toISOString(), eventId: effectiveEventId,
                stationId: p.vehicleId ? vehicles.find(v => v.id === p.vehicleId)?.stationId : undefined, vehicleId: p.vehicleId
            };
            try { 
                await SoulsStore.add(newSoul); 
                showToast(`${nameParts[0]} marked as Soul Won!`, 'success'); 
            }
            catch (error: any) { 
                const msg = error.message || String(error);
                if (msg === 'Failed to fetch' || msg.includes('timeout') || msg === 'SESSION_EXPIRED' || msg === 'Request timed out') {
                    console.warn("[Transportation] Connection dropped. Offline-Queueing Soul", msg);
                    OfflineQueue.enqueue({
                        type: 'SOUL_ADD',
                        payload: newSoul,
                        dedupeKey: `soul_add_${newSoul.id}`
                    });
                    showToast('Saved offline. Syncing soon.', 'info');
                } else {
                    console.error("Failed to add soul", error);
                    setPassengers(passengers.map(pas => pas.id === passengerId ? { ...pas, soulWon: false } : pas));
                    await VehicleStore.updatePassenger({ id: p.id, soulWon: false });
                    showToast('Failed to save soul. Please try again.', 'error'); 
                }
            }
        } else {
            try { 
                await SoulsStore.delete(soulId); 
                showToast(`Soul status removed for ${p.name.split(' ')[0]}`, 'info'); 
            }
            catch (error) { 
                console.error('Failed to remove soul', error); 
                setPassengers(passengers.map(pas => pas.id === passengerId ? { ...pas, soulWon: true } : pas));
                await VehicleStore.updatePassenger({ id: p.id, soulWon: true });
                showToast('Failed to unmark soul. Please try again.', 'error');
            }
        }
    };

    const handleAssignCoordinator = async (vehicleId: string) => {
        if (!selectedCoordinator) return;
        const vehicleRes = await VehicleStore.getVehicles();
        const allVehicles = vehicleRes.status === 'success' ? vehicleRes.data : [];
        const existingAssignment = allVehicles.find(v => v.coordinator === selectedCoordinator && v.id !== vehicleId);
        if (existingAssignment) { showToast(`Error: ${selectedCoordinator} is already assigned to ${existingAssignment.number_plate}`, 'error'); return; }
        const targetVehicle = allVehicles.find(v => v.id === vehicleId);
        if (targetVehicle) {
            const foundUser = coordinators.find(c => c.name === selectedCoordinator);
            const partialUpdate = { id: targetVehicle.id, coordinator: selectedCoordinator, coordinatorContact: foundUser?.contact || 'N/A' };
            VehicleStore.updateVehicle(partialUpdate);
            setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, ...partialUpdate } : v));
            setIsAssigning(null);
        }
    };

    const handleAddCoordinator = async (e: React.FormEvent, form: { firstName: string; lastName: string; username: string; password: string; contact: string; stationId: string; roleType: 'vehicle' | 'stage' }) => {
        e.preventDefault();
        if (!form.contact || form.contact === '256' || form.contact.length <= 3) {
            if (!(await askConfirm('Missing Coordinator Contact', 'No contact provided. Proceed?'))) return;
        }
        const newUser: User = {
            id: crypto.randomUUID(), name: `${form.firstName.trim()} ${form.lastName.trim()}`,
            role: form.roleType === 'vehicle' ? 'Vehicle Coordinator' : 'Stage Coordinator',
            username: form.username, password: form.password, departmentId: TRANSPORT_DEPT_UUID,
            eventId: selectedEventId || user?.eventId, contact: form.contact, stationId: form.stationId || undefined
        };
        try {
            await UserStore.add(newUser);
            if (newUser.stationId) {
                const station = dbStations.find((s: any) => s.id === newUser.stationId);
                if (station) await LogisticsStore.updateStation({ ...station, coordinatorName: newUser.name, coordinatorContact: newUser.contact });
            }
            showToast(`Coordinator ${newUser.name} created successfully.`, 'success');
        } catch (error: any) { showToast(error.message, 'error'); }
    };

    const handleDeleteCoordinator = async (id: string) => {
        if (await askConfirm('Delete Coordinator', 'Are you sure you want to delete this coordinator?')) {
            await UserStore.remove(id);
        }
    };

    const handleOpenAdminVehicle = async (vehicle: TrackedVehicle) => {
        setSelectedAdminVehicle(vehicle);
        const passengerRes = await VehicleStore.getPassengers(vehicle.id);
        const all = passengerRes.status === 'success' ? passengerRes.data : [];
        setAdminVehiclePassengers(all.filter(p => p.vehicleId === vehicle.id));
        setAdminViewMode('detail');
        setAdminDetailTab(vehicle.status === 'Completed' ? 'report' : 'manifest');
    };

    const handleBackToFleet = () => { setAdminViewMode('list'); setSelectedAdminVehicle(null); setAdminVehiclePassengers([]); };
    const handleRemovePassenger = async (passengerId: string) => {
        if (await askConfirm('Remove Passenger', 'Remove this passenger?')) {
            await VehicleStore.deletePassenger(passengerId);
            setPassengers(prev => prev.filter(p => p.id !== passengerId));
        }
    };
    const handlePrintReport = () => window.print();

    const isReturnAvailable = !!myVehicle?.ongoingArrivalTime;
    const isJourneyComplete = !!myVehicle?.returnArrivalTime;

    // ── Context value ─────────────────────────────────────────────────────────
    const contextValue: TransportContextValue = {
        selectedEventId, setSelectedEventId, selectedEvent, filteredEvents,
        vehicles, passengers, coordinators, dbStations, setDbStations,
        isCoordinatorView, myVehicle,
        filterStatus, setFilterStatus, isAssigning, setIsAssigning,
        selectedCoordinator, setSelectedCoordinator,
        adminViewMode, setAdminViewMode,
        selectedAdminVehicle, setSelectedAdminVehicle,
        adminVehiclePassengers, adminDetailTab, setAdminDetailTab,
        activeJourneyTab, isVehicleOpen, setIsVehicleOpen,
        returnPassengerForm, setReturnPassengerForm,
        submittingStage, showHighlights, setShowHighlights,
        refreshData, handleStageUpdate, handleToggleVerify,
        handleAddReturnPassenger, handleMarkSoulWon, handleAssignCoordinator,
        handleAddCoordinator, handleDeleteCoordinator, handleOpenAdminVehicle,
        handleBackToFleet, handleRemovePassenger, switchJourneyTab, handlePrintReport,
        isReturnAvailable, isJourneyComplete, cognitoFormUrl: COGNITO_FORM_URL,
    };

    const showNav = !isCoordinatorView;

    return (
        <TransportContext.Provider value={contextValue}>
            <div className="flex flex-col min-h-full bg-gray-50">
                {showNav && (
                    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 flex-wrap sticky top-0 z-20">
                        <NavLink to="overview" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <Navigation className="w-4 h-4" /> Fleet Overview
                        </NavLink>
                        <NavLink to="coordinators" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <Users className="w-4 h-4" /> Coordinators
                        </NavLink>
                        <NavLink to="stages" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <LayoutList className="w-4 h-4" /> Stage Details
                        </NavLink>
                    </div>
                )}
                <div className="flex-1"><Outlet /></div>
            </div>
            <EventDetailsModal
                event={showHighlights ? selectedEvent || null : null}
                onClose={() => setShowHighlights(false)}
            />
        </TransportContext.Provider>
    );
};

export default TransportationLayout;
