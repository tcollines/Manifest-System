import React, { useState, useEffect, useRef } from 'react';
import { useSafeAsync } from '../hooks/useSafeAsync';
import { useNotification } from './ui/NotificationSystem';
import { isEventLocked, isServiceClosed, validatePlate, validateContact, validateDriverIdentity } from '../utils';
import { VEHICLE_TYPES } from '../constants';
import { ModalType, MinistryEvent, User, Vehicle, Passenger, PickUpStation, PersonalVehicle, Member, ServiceResponse } from '../types';
import { VehicleStore, mapVehicleFromDB, mapPassengerFromDB, mapPersonalVehicleFromDB } from '../database/vehicleStore';
import { UserStore, mapUserFromDB } from '../database/userStore';
import { MemberStore } from '../database/memberStore';
import { LogisticsStore, ExtendedStation, mapStationFromDB } from '../database/logisticsStore';
import { ManifestStore } from '../database/manifestStore';
import { EventStore } from '../database/eventStore';
import { SoulsStore } from '../database/soulsStore';
import { supabase } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import {
  ClipboardCheck,
  Search,
  Plus,
  CheckCircle,
  Clock,
  Calendar,
  ArrowLeft,
  UserPlus,
  Database,
  FileText,
  Upload,
  Ticket,
  Bus,
  MapPin,
  LayoutList,
  Users,
  Eye,
  Download,
  ChevronRight,
  Shield,
  Trash2,
  X,
  Phone,
  Key,
  Save,
  CreditCard,
  GraduationCap,
  Printer,
  Lock,
  FileSpreadsheet,
  AlertTriangle,
  Building2,
  ShieldCheck,
  BarChart3,
  CalendarPlus,
  Baby,
  CalendarCheck,
  Edit2,
  History,
  Settings,
  User as UserIcon,
  Copy,
  Heart,
  Loader2
} from 'lucide-react';
import EventDetailsModal from './EventDetailsModal';
import { AssetsTab } from './AssetsTab';
import NumberPlateInput from './NumberPlateInput';
import PhoneInput from './PhoneInput';
import ManualCountModal from './ManualCountModal';

interface RegistrationDashboardProps {
  events: MinistryEvent[];
  currentUser: User;
  onOpenModal?: (type: ModalType) => void;
  refreshParentData?: () => void;
  // [PHASE B] URL-driven tab: injected by RegistrationLayout from URL segment.
  // When provided, overrides internal state. When omitted, falls back to internal.
  urlTab?: 'checkin' | 'events' | 'database';
}

type Tab = 'checkin' | 'events' | 'database';
type ViewMode = 'list' | 'service-active' | 'service-review' | 'Vehicle-view' | 'station-detail' | 'register-new' | 'bulk-import' | 'bulk-import-members' | 'member-detail';

// Helper for sanitizing empty strings to undefined
const sanitize = (val: string | undefined): string | undefined => (!val || val.trim() === '') ? undefined : val;

const RegistrationDashboard: React.FC<RegistrationDashboardProps> = ({ events, currentUser, onOpenModal, refreshParentData, urlTab }) => {
  const { showToast, confirm: askConfirm } = useNotification();

  // [PHASE B] activeTab is now URL-driven when urlTab prop is provided.
  // Internal state is kept as a fallback for Logistics role-forcing effects.
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (urlTab) return urlTab;
    if (currentUser.role === 'Logistics') return 'events';
    return 'checkin'; // Default — no more localStorage read
  });

  // [PHASE B] Sync internal state when URL segment changes
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Force re-render state
  const [, forceUpdate] = useState(0);

  // VIEW MODE SHOULD NOT BE PERSISTED - IT DEPENDS ON VOLATILE STATE (selectedService, etc.)
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Force 'events' tab for Logistics users to prevent flicker if role updates late
  useEffect(() => {
    if (currentUser.role === 'Logistics' && activeTab !== 'events') {
      setActiveTab('events');
    }
  }, [currentUser.role]);


  // Logistics: Auto-Select Station if assigned


  const [members, setMembers] = useState<Member[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Selection State for Hierarchy
  const [selectedService, setSelectedService] = useState<MinistryEvent | null>(null); // For Check-in

  // Fix for blank screen on reload: If view is 'service-active' but no service selected, go back to list
  useEffect(() => {
    if (viewMode === 'service-active' && !selectedService) {
      setViewMode('list');
    }
    // Force reset viewMode for Logistics (they don't use register-new or other Check-In views)
    if (currentUser.role === 'Logistics' && (viewMode === 'register-new' || viewMode === 'checkin')) {
      setViewMode('list');
    }
  }, [viewMode, selectedService, currentUser.role]);

  // Logistics Hierarchy State
  const [selectedLogisticsEvent, setSelectedLogisticsEvent] = useState<MinistryEvent | null>(null); // Level 1 -> 2

  const [selectedStation, setSelectedStation] = useState<ExtendedStation | null>(null); // Level 2 -> 3
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); // Level 3 -> 4


  // Logistics: Auto-Select Station if assigned
  // Loading state to prevent flicker of "Select Event" screen
  const [isLogisticsInitializing, setIsLogisticsInitializing] = useState(() => {
    return currentUser.role === 'Logistics' && !!currentUser.stationId;
  });

  useEffect(() => {
    const autoSelectStation = async () => {
      console.log("AutoSelect Trace: Start", { role: currentUser.role, stId: currentUser.stationId });

      if (currentUser.role === 'Logistics' && currentUser.stationId && !selectedStation) {
        try {
          const { data: stationData, error } = await supabase
            .from('pickup_stations')
            .select('*')
            .eq('id', currentUser.stationId)
            .single();

          console.log("AutoSelect Trace: Station Data", stationData, error);

          if (stationData) {
            const station: ExtendedStation = {
              ...stationData,
              eventId: stationData.event_id, // CRITICAL: Map to camelCase for filter matching
              coordinatorName: stationData.coordinator_name || '',
              coordinatorContact: stationData.coordinator_contact || '',
              totalPassengers: 0,
              vehicles: []
            };

            const relatedEvent = events.find(e => e.id === stationData.event_id);
            console.log("AutoSelect Trace: Related Event", relatedEvent);

            if (relatedEvent) {
              setSelectedLogisticsEvent(relatedEvent);
              setSelectedStation(station);
              setViewMode('station-detail');
            }
          }
        } catch (err) {
          console.error("Auto-select station failed", err);
        } finally {
          setIsLogisticsInitializing(false);
        }
      } else if (!currentUser.stationId) {
        setIsLogisticsInitializing(false);
      }
    };
    autoSelectStation();
  }, [currentUser, events, selectedStation]);

  const [stationEntrants, setStationEntrants] = useState<User[]>([]);

  // Logistics Data
  const [stations, setStations] = useState<ExtendedStation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  // Parking State
  const [personalVehicles, setPersonalVehicles] = useState<PersonalVehicle[]>([]);
  const [isAddParkingOpen, setIsAddParkingOpen] = useState(false);
  const [parkingForm, setParkingForm] = useState({ number_plate: '', driverName: '', driverContact: '256' });

  // Add Station Form State
  const [isAddStationOpen, setIsAddStationOpen] = useState(false);

  const initialStationForm = {
    name: '',
    location: '',
    // Cooridnator fields removed as per request (handled in Logistics/Transportation now)
    coordinatorName: '',
    coordinatorContact: '',
    // Data Entrant Initials
    entrantName: '',
    entrantUsername: '',
    entrantPassword: '',
    id: '' // Track ID for edits
  };
  const [stationForm, setStationForm] = useState(initialStationForm);



  // Data Entrant - Add Entrant State
  const [isAddEntrantOpen, setIsAddEntrantOpen] = useState(false);
  const [newEntrant, setNewEntrant] = useState({
    name: '',
    username: '',
    password: ''
  });



  // Data Entrant - Add Vehicle State
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    number_plate: '',
    driverName: '',
    driverContact: '256', // Initialize with 256
    driverNin: '',
    type: 'Taxi' as 'Car' | 'Taxi' | 'Coaster' | 'Bus',
    capacity: '',
    coordinator: '',
    id: '' // Added ID field for tracking edits
  });

  // Add Passenger Modal State
  const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);
  const [isAddChildrenOpen, setIsAddChildrenOpen] = useState(false);
  const [childrenForm, setChildrenForm] = useState({ count: '0' });
  const initialPassengerForm = {
    name: '',
    category: 'Member',
    gender: 'Male',
    contact: '256', // Initialize with 256
    residence: '',
    isFirstTime: 'No',
    school: '',
    studentClass: '',
    boardingType: 'Day'
  };
  const [passengerForm, setPassengerForm] = useState(initialPassengerForm);

  // Registration Form State
  const initialForm = {
    name: '',
    countryCode: '+256',
    phone: '256', // Initialize with 256
    residence: '',
    email: '',
    occupation: '',
    placeOfWork: '',
    bornAgain: 'No',
    isPhanerooMember: 'No',
    referralSource: '',
    category: 'First Timer',
    gender: 'Male'
  };
  const [formData, setFormData] = useState(initialForm);
  const [bulkMemberText, setBulkMemberText] = useState('');

  // Bulk Selection & Delete State
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedEventId, setSelectedEventId] = useState<string>(events.find(e => e.type === 'Event')?.id || '');
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [eventToDelete, setEventToDelete] = useState<MinistryEvent | null>(null);

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // New Event/Service State
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventFormType, setEventFormType] = useState<'Service' | 'Event'>('Service');
  const [eventForm, setEventForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '17:00',
    location: 'Phaneroo Grounds',
    description: ''
  });

  // Highlights Modal State
  const [showHighlights, setShowHighlights] = useState(false);
  const [highlightEvent, setHighlightEvent] = useState<MinistryEvent | null>(null);
  const [isChildCountModalOpen, setIsChildCountModalOpen] = useState(false);

  // Check-in Stats State
  const [checkInStats, setCheckInStats] = useState({ total: 0, firstTimers: 0, soulsWon: 0 });
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [checkedSoulIds, setCheckedSoulIds] = useState<Set<string>>(new Set());

  // Member Details View State
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<{ member: Member, attendedCount: number, totalServices: number, history: any[] } | null>(null);
  const [isEditingMember, setIsEditingMember] = useState(false);





  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // --- REALTIME SYNC: Service Check-Ins ---
  useEffect(() => {
    const manifestId = currentUser.manifestId || currentUser.manifest_id;
    if (!selectedService || viewMode !== 'service-active' || !manifestId) return;

    const channelName = `service-checkins-${selectedService.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_attendance',
          // Enforce strict tenant isolation alongside service scope
          filter: `manifest_id=eq.${manifestId}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // Double verification just to be safe
          if (newRecord && (newRecord as any).service_id !== selectedService.id) return;
          if (oldRecord && (oldRecord as any).service_id !== selectedService.id) return;

          if (eventType === 'INSERT') {
            const memberId = (newRecord as any).member_id;
            setCheckedInIds(prev => {
              if (prev.has(memberId)) return prev;
              const next = new Set(prev);
              next.add(memberId);
              setCheckInStats(stats => ({ ...stats, total: stats.total + 1 }));
              return next;
            });
          } else if (eventType === 'DELETE') {
            const memberId = (oldRecord as any).member_id;
            setCheckedInIds(prev => {
              if (!prev.has(memberId)) return prev;
              const next = new Set(prev);
              next.delete(memberId);
              setCheckInStats(stats => ({ ...stats, total: Math.max(0, stats.total - 1) }));
              return next;
            });
          }
        }
      )
      .subscribe();

    const channel_souls = supabase
      .channel(`service-souls-${selectedService.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'souls',
          filter: `source_id=eq.${selectedService.id}`
        },
        (payload) => {
          const soulId = (payload.new as any).id;
          setCheckedSoulIds(prev => {
            if (prev.has(soulId)) return prev;
            const next = new Set(prev);
            next.add(soulId);
            setCheckInStats(stats => ({ ...stats, soulsWon: stats.soulsWon + 1 }));
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'souls',
          filter: `source_id=eq.${selectedService.id}`
        },
        (payload) => {
          const soulId = (payload.old as any).id;
          setCheckedSoulIds(prev => {
            if (!prev.has(soulId)) return prev;
            const next = new Set(prev);
            next.delete(soulId);
            setCheckInStats(stats => ({ ...stats, soulsWon: Math.max(0, stats.soulsWon - 1) }));
            return next;
          });
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channel_souls);
    };
  }, [selectedService?.id, viewMode, currentUser.manifestId, currentUser.manifest_id]);


  // Robust Role Check: Case-insensitive and includes Department ID 'd5' (Transportation/Logistics) - Fixes Data Entrant Guard
  // TODO: Refactor to use Department Slug from Global Context/Store
  const isLogisticsRole = (currentUser.role && currentUser.role.trim().toLowerCase() === 'logistics') || currentUser.departmentId === '4630e48a-f97e-48fd-a901-864b591c282f' || currentUser.departmentId === 'd5';

  // Permission for Deletion: Head of Dept or Administration Department (d0) or Administrator
  const canDeleteLogistics = currentUser.role === 'Head of Dept' || currentUser.departmentId === 'd0' || currentUser.role === 'Administrator';





  const effectiveTab = isLogisticsRole ? 'events' : activeTab; // Force 'events' for Logistics to prevents flicker
  // Force 'list' viewMode for Logistics if they somehow landed on 'register-new' (which is for Check-In)
  if (isLogisticsRole && viewMode === 'register-new') {
    // This is a side-effect in render, but react specific pattern is to use useEffect
    // We will handle this in useEffect below, but valid for effectiveView logic.
  }
  const isMember = currentUser.role === 'Member';
  const canCreateService = ['Administrator', 'Head of Dept', 'Reg. Admin'].includes(currentUser.role);

  // Auto-Navigation for Logistics Users
  useEffect(() => {
    // Only proceed if user has role, is assigned a station, and stations data is loaded
    if (isLogisticsRole && currentUser.stationId && stations.length > 0) {
      // Find the user's station
      const myStation = stations.find(s => s.id === currentUser.stationId);


      if (myStation) {
        // Auto-select the event (Level 1) - Ideally connected to the station or just the active one
        // For now, if no event is selected, just pick the one the station belongs to or the first "Event" type
        if (!selectedLogisticsEvent) {
          // Try to find the event from the station (if we had eventId on station) or just pick active event
          const activeEvent = events.find(e => e.type === 'Event'); // Simplified: Pick first event
          if (activeEvent) {
            setSelectedLogisticsEvent(activeEvent);
          }

        }

        // Auto-select the station (Level 2)
        if (!selectedStation) {
          setSelectedStation(myStation);
        }

        // Auto-switch view to details
        if (viewMode !== 'station-detail') {
          setViewMode('station-detail');
        }
      }

    }
  }, [isLogisticsRole, currentUser.stationId, stations, events, selectedLogisticsEvent, selectedStation, viewMode]);

  // Derived State - Filters
  // Sort by CREATED AT (Newest First)
  const sortEvents = (a: MinistryEvent, b: MinistryEvent) => {
    if (a.createdAt && b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  };

  const services = events.filter(e => e.type === 'Service').sort(sortEvents);
  const logisticsEvents = events.filter(e => e.type === 'Event').sort(sortEvents);

  // Debounce Hook
  function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debouncedValue;
  }

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Ultra-Fast Search Logic
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const refreshData = async () => {
    try {
      // 1. Cancellation: Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Only search if query is empty (reset) or >= 2 chars
      const effectiveQuery = debouncedSearchQuery.length >= 2 ? debouncedSearchQuery : '';
      const queryToSend = effectiveQuery;

      setIsSearching(!!effectiveQuery);

      // Special Fetch Logic for Check-In Filters
      // Only apply filterCategory if we are in the Check-In tab
      const isCheckInTab = activeTab === 'checkin';
      const effectiveFilterCategory = isCheckInTab ? filterCategory : null;

      let membersPromise: Promise<ServiceResponse<Member[]>>;

      // OPTIMIZATION: Reduce page size during search for faster rendering
      const currentPageSize = effectiveQuery ? 20 : itemsPerPage;

      if (effectiveFilterCategory) {
        if (checkedInIds.size > 0) {
          // Fetch specific IDs (No signal support on getManyByIds yet, but it's fast)
          membersPromise = MemberStore.getManyByIds(Array.from(checkedInIds));
        } else {
          membersPromise = Promise.resolve({ status: 'success', data: [] } as ServiceResponse<Member[]>);
        }
      } else {
        // Pass signal for cancellation
        membersPromise = MemberStore.getMembers(currentPage, currentPageSize, queryToSend, signal);
      }

      // Parallel Fetch - Note: Only members fetch is cancellable for now, others let run (usually cached or fast)
      const [fetchedStations, fetchedVehicles, fetchedPassengers, fetchedMembersResult, fetchedUsers, fetchedPersonalCars] = await Promise.all([
        LogisticsStore.getStations(),
        VehicleStore.getVehicles({ eventId: selectedLogisticsEvent?.id }),
        VehicleStore.getPassengers({ eventId: selectedLogisticsEvent?.id }),
        membersPromise.catch(err => {
          // Handle AbortError specifically to return a "cancelled" state
          if (signal.aborted || err.name === 'AbortError') return { status: 'cancelled' } as any;
          throw err;
        }),
        UserStore.getAll(),
        VehicleStore.getPersonalVehicles()
      ]);

      if (signal.aborted) return; // Stop if cancelled

      setStations(fetchedStations.status === 'success' ? fetchedStations.data : []);
      setVehicles(fetchedVehicles.status === 'success' ? fetchedVehicles.data : []);
      setPersonalVehicles(fetchedPersonalCars.status === 'success' ? fetchedPersonalCars.data : []);
      setPassengers(fetchedPassengers.status === 'success' ? fetchedPassengers.data : []);

      // Handle Member Result
      if (fetchedMembersResult.status === 'success' && Array.isArray(fetchedMembersResult.data)) {
        setMembers(fetchedMembersResult.data);
        setTotalMembers(fetchedMembersResult.count || fetchedMembersResult.data.length);
      } else if (fetchedMembersResult.status !== 'cancelled') {
        // Error handling
        const errorMsg = (fetchedMembersResult as any).message || "Unknown error";
        console.error("Member Fetch Error:", errorMsg);
        showToast(`Error loading members: ${errorMsg}`, 'error');
        setMembers([]);
        setTotalMembers(0);
      }

      setCoordinators(fetchedUsers.status === 'success' && Array.isArray(fetchedUsers.data)
        ? fetchedUsers.data.filter(u => u.role === 'Vehicle Coordinator' || u.role === 'Coordinator')
        : []);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error refreshing data:", error);
        showToast("Critical error refreshing data.", 'error');
      }
    } finally {
      if (abortControllerRef?.current?.signal?.aborted === false) {
        setIsSearching(false);
      }
    }
  };

  const refreshDataRef = useRef(refreshData);
  refreshDataRef.current = refreshData;

  useEffect(() => {
    // Skip fetch if length is exactly 1 (wait for at least 2 chars to search)
    // BUT we MUST fetch if length is 0 (cleared search)
    if (debouncedSearchQuery.length === 1) {
      return;
    }

    refreshData();
  }, [currentPage, debouncedSearchQuery, activeTab, filterCategory, selectedLogisticsEvent?.id]); // Added filterCategory dependency

  const selectedServiceRef = useRef(selectedService);
  useEffect(() => {
    selectedServiceRef.current = selectedService;
  }, [selectedService]);

  // Realtime Subscriptions
  // Ref to track checked-in IDs and Members for robust Realtime logic
  const checkedInIdsRef = useRef<Set<string>>(new Set());
  const membersRef = useRef<Member[]>([]);

  // Sync Refs with State whenever state changes
  useEffect(() => {
    checkedInIdsRef.current = checkedInIds;
  }, [checkedInIds]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  // Realtime Subscriptions with Granular Updates
  useEffect(() => {
    const activeOperationId = selectedService?.id || selectedLogisticsEvent?.id;
    if (!activeOperationId) return;

    const channel = supabase.channel(`reg-dashboard-scoped-${activeOperationId}`);

    // Helpers for granular updates
    const handleStationChange = (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      if (eventType === 'INSERT') {
        setStations(prev => {
          if (prev.find(s => s.id === newRecord.id)) return prev;
          const mapped = mapStationFromDB(newRecord);
          return [mapped, ...prev];
        });
      } else if (eventType === 'UPDATE') {
        const mapped = mapStationFromDB(newRecord);
        setStations(prev => prev.map(s => s.id === mapped.id ? {
          ...s,
          ...mapped
        } : s));
      } else if (eventType === 'DELETE') {
        setStations(prev => prev.filter(s => s.id !== oldRecord.id));
      }
    };

    const handleVehicleChange = (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      if (eventType === 'INSERT') {
        setVehicles(prev => {
          if (prev.find(v => v.id === newRecord.id)) return prev;
          return [mapVehicleFromDB(newRecord), ...prev];
        });
      } else if (eventType === 'UPDATE') {
        const mapped = mapVehicleFromDB(newRecord);
        setVehicles(prev => prev.map(v => v.id === mapped.id ? mapped : v));
        if (selectedVehicle?.id === mapped.id) {
          setSelectedVehicle(mapped);
        }
      } else if (eventType === 'DELETE') {
        setVehicles(prev => prev.filter(v => v.id !== oldRecord.id));
        if (selectedVehicle?.id === oldRecord.id) setSelectedVehicle(null);
      }
    };

    const handlePassengerChange = (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      if (eventType === 'INSERT') {
        setPassengers(prev => {
          if (prev.find(p => p.id === newRecord.id)) return prev;
          return [mapPassengerFromDB(newRecord), ...prev];
        });
      } else if (eventType === 'UPDATE') {
        const mapped = mapPassengerFromDB(newRecord);
        setPassengers(prev => prev.map(p => p.id === mapped.id ? mapped : p));
      } else if (eventType === 'DELETE') {
        setPassengers(prev => prev.filter(p => p.id !== oldRecord.id));
      }
    };

    const handleUserChange = (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        // Only track coordinators
        if (newRecord.role !== 'Vehicle Coordinator' && newRecord.role !== 'Coordinator') return;

        const mappedUser = mapUserFromDB(newRecord);
        setCoordinators(prev => {
          const exists = prev.find(u => u.id === mappedUser.id);
          if (exists) return prev.map(u => u.id === mappedUser.id ? mappedUser : u);
          return [mappedUser, ...prev];
        });
      } else if (eventType === 'DELETE') {
        setCoordinators(prev => prev.filter(u => u.id !== oldRecord.id));
      }
    };
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_stations', filter: `event_id=eq.${activeOperationId}` }, handleStationChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: `event_id=eq.${activeOperationId}` }, handleVehicleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'passengers', filter: `event_id=eq.${activeOperationId}` }, handlePassengerChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, handleUserChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_vehicles', filter: `current_service_id=eq.${activeOperationId}` }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (eventType === 'INSERT') {
          setPersonalVehicles(prev => {
            if (prev.some(v => v.id === newRecord.id)) return prev;
            return [mapPersonalVehicleFromDB(newRecord), ...prev];
          });
        }
        else if (eventType === 'UPDATE') {
          const mapped = mapPersonalVehicleFromDB(newRecord);
          setPersonalVehicles(prev => prev.map(v => v.id === mapped.id ? mapped : v));
        }
        else if (eventType === 'DELETE') setPersonalVehicles(prev => prev.filter(v => v.id !== oldRecord.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedService?.id, selectedLogisticsEvent?.id]);

  // Clear selections when changing tabs or views
  useEffect(() => {
    setSelectedMemberIds(new Set());
  }, [activeTab, viewMode]);





  const handleSelectStation = async (station: ExtendedStation) => {
    setSelectedStation(station);
    // Fetch data entrants for this station
    const result = await UserStore.getAll();
    if (result.status === 'success') {
      const entrants = result.data.filter(u => u.role === 'Logistics' && u.stationId === station.id);
      setStationEntrants(entrants);
    }
  };

  const handleOpenService = async (service: MinistryEvent) => {
    setSelectedService(service);
    setViewMode('service-active');
    // Fetch initial stats
    const stats = await MemberStore.getServiceStats(service.id, service.date);
    const souls = await SoulsStore.getServiceStats(service.id);
    const childrenCount = service.stats?.manualChildrenCount || 0;
    setCheckInStats({ total: stats.total + childrenCount, firstTimers: stats.firstTimers, soulsWon: souls });
    setCheckedInIds(new Set(stats.memberIds));
  };

  /* --- DOWNLOAD HIGHLIGHTS --- */
  const handleDownloadHighlights = () => {
    if (!selectedService) return;

    const stats = [
      ['Metric', 'Value'],
      ['Service Title', selectedService.title],
      ['Date', selectedService.date],
      ['Total Members Checked In', checkInStats.total],
      ['First Timers', checkInStats.firstTimers],
      ['Souls Won', checkInStats.soulsWon],
      ['Children Count', selectedService.stats?.manualChildrenCount || 0]
    ];

    const ws = XLSX.utils.aoa_to_sheet(stats);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Highlights");
    XLSX.writeFile(wb, `${selectedService.title.replace(/\s+/g, '_')}_Highlights.xlsx`);
  };

  // Back Handlers for Hierarchy
  const handleBackLogistics = () => {
    if (selectedVehicle) {
      setSelectedVehicle(null);
    } else if (selectedStation) {
      // If logistics role, they can't go back further than their station
      if (isLogisticsRole) return;
      setSelectedStation(null);
      setStationEntrants([]);
    } else if (selectedLogisticsEvent) {
      setSelectedLogisticsEvent(null);
    }
  };

  const handleBackRegistration = () => {
    // If we are in "Register New" mode and have an active service, go back to that service
    if (viewMode === 'register-new' && selectedService) {
      setViewMode('service-active');
    } else {
      // Otherwise (from Service Dashboard OR from Register New with no service), go to list
      setViewMode('list');
      setSelectedService(null);
    }
    setSearchQuery('');
    setFormData(initialForm);
    setBulkMemberText('');
  };

  // --- PRINT VEHICLE LOGIC ---
  const handlePrintManifest = async () => {
    if (!selectedVehicle || !selectedStation) return;

    // Fetch Global Manifest Name from Store
    const globalManifest = await ManifestStore.get();
    const manifestName = globalManifest?.name || selectedStation.name.toUpperCase();

    const vPassengers = passengers.filter(p => p.vehicleId === selectedVehicle.id);
    const groups = {
      'Members': vPassengers.filter(p => p.category === 'Member'),
      'Schools': vPassengers.filter(p => p.category === 'Student'),
      'Institutions': vPassengers.filter(p => p.category === 'Institution')
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let htmlContent = `
        <html>
        <head>
            <title>Manifest - ${selectedVehicle.number_plate}</title>
            <style>
                @media print {
                    @page { size: landscape; margin: 5mm; }
                    body { -webkit-print-color-adjust: exact; }
                    .page-break { page-break-after: always; break-after: page; display: block; height: 0; }
                }
                body { font-family: 'Arial', sans-serif; font-size: 10px; margin: 0; padding: 10px; }
                .header-wrapper { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 2px solid black; padding-bottom: 5px; }
                .logo-container { width: 80px; text-align: left; }
                .main-title { text-align: center; flex: 1; }
                .main-title h1 { font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; }
                .main-title h2 { font-size: 14px; font-weight: bold; margin: 2px 0 0 0; text-transform: uppercase; color: #333; }
                
                .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; font-weight: bold; }
                .meta-table td { padding: 2px 5px; border: none; }
                .meta-label { text-transform: uppercase; }
                .meta-value { border-bottom: 1px solid black; min-width: 150px; display: inline-block; }

                table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
                table.data-table th, table.data-table td { border: 1px solid black; padding: 4px; text-align: left; height: 22px; vertical-align: middle; }
                table.data-table th { background-color: white; font-weight: 900; text-align: center; text-transform: uppercase; font-size: 10px; }
                .center { text-align: center; }
                
                .footer-consent { display: flex; gap: 20px; font-size: 9px; line-height: 1.2; margin-top: 5px; }
                .col-left, .col-right { flex: 1; text-align: justify; }
                .col-left h4 { margin: 4px 0 2px 0; font-size: 9px; text-decoration: underline; }
                .col-right h4 { margin: 4px 0 2px 0; font-size: 9px; }
                ol { margin: 2px 0; padding-left: 15px; }

                .page-container { 
                    page-break-after: always;
                    break-after: page;
                    display: flex; 
                    flex-direction: column;
                }
            </style>
        </head>
        <body>
    `;

    const getConsentHTML = () => `
        <div class="footer-consent">
            <div class="col-left">
                <strong>*CONSENT TO HOLD AND USE YOUR PERSONAL DATA</strong><br/>
                By appending my signature on this form, I consent to Phaneroo Ministries International (hereinafter referred to as PMI) holding and using my personal information for the purposes only;
                <ol>
                    <li>To keep you informed of events, services and other related communications from the ministry.</li>
                    <li>To share your contact details with our teams for experience sharing with the ministry.</li>
                    <li>To use your photograph(s) and video(s) taken during any of our events on our communication materials.</li>
                </ol>
                <br/>
                <strong>CONSENT TO BE TRANSPORTED BY A PMI CHARTERED VEHICLE</strong><br/>
                By appending my signature to this document I consent to be transported in a vehicle chartered by Phaneroo Ministries International (hereinafter referred to as PMI)
                to........................................... and/ from........................................... for...........................................
            </div>
            <div class="col-right">
                I also acknowledge the following;
                <ol>
                    <li>To be transported in a vehicle chartered by PMI to and fro the ongoing PMI church service or event.</li>
                    <li>I acknowledge that PMI Transportation Department has taken reasonable measures to ensure that the vehicle is in proper mechanical condition, safe and that it has the right to establish rules and regulations regarding the use of this vehicle.</li>
                    <li>I agree to comply with any such rules and regulations, including but not limited to wearing a seatbelt and refraining from engaging in distracted driving behavior.</li>
                    <li>I absolve PMI of any responsibility that arises out of accidents, damage and/ or malfunctions to my person and/ or property whilst abode the said vehicle.</li>
                    <li>I understand that PMI reserves the right to admit anyone into the vehicle chartered by it.</li>
                    <li>I have read and understood the above terms and conditions and I voluntarily agree to the same and I so consent.</li>
                </ol>
            </div>
        </div>
    `;

    const createPage = (category: string, chunk: Passenger[], pageNum: number, totalPages: number, totalCount: number) => {
      let tableHeader = '';
      let rowsHtml = '';
      const eventTitle = selectedLogisticsEvent?.title || 'MINISTRY EVENT';
      const eventDate = selectedLogisticsEvent?.date || new Date().toLocaleDateString();

      // Filter First Timers based on the current category
      let categoryFirstTimers = 0;
      if (category === 'Members') {
        categoryFirstTimers = vPassengers.filter(p => p.category === 'Member' && p.isFirstTime === 'Yes').length;
      } else if (category === 'Schools') {
        categoryFirstTimers = vPassengers.filter(p => p.category === 'Student' && p.isFirstTime === 'Yes').length;
      } else if (category === 'Institutions') {
        categoryFirstTimers = vPassengers.filter(p => p.category === 'Institution' && p.isFirstTime === 'Yes').length;
      }

      // Define Columns based on Category
      if (category === 'Schools') {
        tableHeader = `
                <tr>
                    <th style="width: 30px;">No.</th>
                    <th>FULL NAME</th>
                    <th style="width: 40px;">GENDER</th>
                    <th>CONTACT</th>
                    <th>PLACE OF RESIDENCE</th>
                    <th>NAME OF SCHOOL</th>
                    <th style="width: 60px;">DAY / BOARDING</th>
                    <th style="width: 50px;">CLASS</th>
                    <th style="width: 50px;">VACIST</th>
                    <th style="width: 80px; font-size: 9px;">CONSENT TO STORE YOUR INFO</th>
                </tr>
            `;
      } else if (category === 'Institutions') {
        tableHeader = `
                <tr>
                    <th style="width: 30px;">No.</th>
                    <th>FULL NAME</th>
                    <th style="width: 40px;">GENDER</th>
                    <th>CONTACT</th>
                    <th>PLACE OF RESIDENCE</th>
                    <th>NAME OF INSTITUTION</th>
                    <th style="width: 80px; font-size: 9px;">CONSENT TO STORE YOUR INFO</th>
                </tr>
            `;
      } else {
        // Members (Residency)
        tableHeader = `
                <tr>
                    <th style="width: 30px;">No.</th>
                    <th>FULL NAME</th>
                    <th style="width: 40px;">GENDER</th>
                    <th>CONTACT</th>
                    <th>PLACE OF RESIDENCE</th>
                    <th>ARE YOU A FIRST TIMER</th>
                </tr>
            `;
      }

      // Generate Rows
      for (let i = 0; i < 15; i++) {
        const p = chunk[i];
        const no = (pageNum * 15) + (i + 1);
        const name = p ? p.name.toUpperCase() : '';
        const contact = p ? p.contact : '';
        const residence = p ? p.residence.toUpperCase() : '';

        // Gender
        const gender = p ? (p.gender === 'Male' ? 'M' : 'F') : '';

        let rowContent = '';

        if (category === 'Schools') {
          const school = p?.school?.toUpperCase() || '';
          const studentClass = p?.studentClass?.toUpperCase() || '';
          const db = p?.boardingType ? (p.boardingType === 'Day' ? 'D' : 'B') : '';
          rowContent = `
                    <td class="center">${no}.</td>
                    <td style="white-space: nowrap; overflow: hidden; max-width: 150px; font-size: 9px; text-overflow: ellipsis;">${name}</td>
                    <td class="center">${gender}</td>
                    <td>${contact}</td>
                    <td>${residence}</td>
                    <td style="font-size: 9px;">${school}</td>
                    <td class="center">${db}</td>
                    <td class="center">${studentClass}</td>
                    <td></td>
                    <td></td>
                `;
        } else if (category === 'Institutions') {
          const institution = p?.school?.toUpperCase() || ''; // Using school field for institution name
          rowContent = `
                    <td class="center">${no}.</td>
                    <td style="white-space: nowrap; overflow: hidden; max-width: 150px; font-size: 9px; text-overflow: ellipsis;">${name}</td>
                    <td class="center">${gender}</td>
                    <td>${contact}</td>
                    <td>${residence}</td>
                    <td style="font-size: 9px;">${institution}</td>
                    <td></td>
                `;
        } else {
          // Members
          const isFirstTime = p?.isFirstTime === 'Yes' ? 'YES' : (p ? 'NO' : '');
          rowContent = `
                    <td class="center">${no}.</td>
                    <td style="white-space: nowrap; overflow: hidden; max-width: 150px; font-size: 9px; text-overflow: ellipsis;">${name}</td>
                    <td class="center">${gender}</td>
                    <td>${contact}</td>
                    <td>${residence}</td>
                    <td class="center">${isFirstTime}</td>
                `;
        }

        rowsHtml += `<tr>${rowContent}</tr>`;
      }

      const titleMap: any = {
        'Members': 'RESIDENCY REGISTRATION FORM',
        'Schools': 'SCHOOLS REGISTRATION FORM',
        'Institutions': 'INSTITUTION REGISTRATION FORM'
      };

      return `
            <div class="page-container ${pageNum < totalPages - 1 ? '' : ''}">
                <div class="header-wrapper">
                    <div class="logo-container">
                        ${globalManifest?.logoUrl
          ? `<img src="${globalManifest.logoUrl}" style="width: 50px; height: 50px; object-fit: contain;" alt="Logo" />`
          : `<div style="width: 50px; height: 50px; background: black; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 8px;">LOGO</div>`
        }
                    </div>
                    <div class="main-title">
                        <h1>${eventTitle}</h1>
                        <h2>${titleMap[category]}</h2>
                    </div>
                    <div class="logo-container"></div> <!-- Spacer -->
                </div>

                <table class="meta-table">
                    <tr>
                        <td style="width: 10%;">MANIFEST NAME:</td>
                        <td style="width: 30%; border-bottom: 1px solid black;">${manifestName}</td>
                        <td style="width: 10%;">REGION:</td>
                        <td style="width: 20%; border-bottom: 1px solid black;">CENTRAL</td>
                        <td style="width: 10%;">TOTAL:</td>
                        <td style="width: 20%; border-bottom: 1px solid black;">${totalCount}</td>
                    </tr>
                    <tr>
                        <td>MANIFEST ID:</td>
                        <td style="border-bottom: 1px solid black;">CTL/EBB01R</td>
                        <td>EVENT DATE:</td>
                        <td style="border-bottom: 1px solid black;">${eventDate}</td>
                        <td>FIRST TIMERS:</td>
                        <td style="border-bottom: 1px solid black;">${categoryFirstTimers}</td>
                    </tr>
                </table>

                <table class="data-table">
                    <thead>${tableHeader}</thead>
                    <tbody>${rowsHtml}</tbody>
                </table>

                ${category === 'Members' ? `
                    <div style="margin-top: 5px; margin-bottom: 10px; font-weight: bold; font-size: 11px; text-align: right;">
                        CHILDREN COUNT: <span style="border-bottom: 1px solid black; display: inline-block; min-width: 50px; text-align: center;">${selectedVehicle.childrenCount || 0}</span>
                    </div>
                ` : ''}

                ${getConsentHTML()}
            </div>
        `;
    };

    // Iterate categories and chunks
    Object.entries(groups).forEach(([category, catPassengers], catIndex, catArray) => {
      if (catPassengers.length === 0 && vPassengers.length > 0) return; // Only skip if other categories exist. If vehicle empty, print Member form.

      // Chunk into 15
      const chunkSize = 15;
      const chunks = [];
      for (let i = 0; i < catPassengers.length; i += chunkSize) {
        chunks.push(catPassengers.slice(i, i + chunkSize));
      }
      if (chunks.length === 0) chunks.push([]); // Ensure at least one page if empty

      chunks.forEach((chunk, i) => {
        htmlContent += createPage(category, chunk, i, chunks.length, catPassengers.length);
      });
    });

    // Handle case where vehicle is completely empty (print one empty Member/Residency page)
    if (vPassengers.length === 0) {
      htmlContent += createPage('Members', [], 0, 1, 0);
    }

    htmlContent += `</body></html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Delay slightly to ensure render
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };


  // --- REGISTRATION LOGIC ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData({ ...formData, phone: validateContact(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // FIX: Define fullPhone early
    const fullPhone = formData.phone;

    const isServiceActive = !!selectedService;
    let serviceIdToUse: string | null = null;
    let autoSavedEvent: any = null;

    if (isServiceActive && selectedService) {
      if (selectedService.id.startsWith('evt-')) {
        try {
          showToast("Saving new event before registration...", "info");
          const realEvent = await EventStore.add(selectedService);
          autoSavedEvent = realEvent;
          serviceIdToUse = realEvent.id;

          // Update Local State
          // We must update the selectedService ref for subsequent calls
          setSelectedService(realEvent);
          // setServices removed as it does not exist. Parent events prop won't update immediately but selectedService is robust.
        } catch (e) {
          console.error("Auto-save event failed", e);
          showToast("Failed to save event. Member will be saved but NOT checked in.", "warning");
          // Fallback: Don't check in
        }
      } else {
        serviceIdToUse = selectedService.id;
      }
    }

    const newMember: Member = {
      id: uuidv4(),
      name: formData.name,
      category: formData.category as any,
      phone: fullPhone,
      gender: formData.gender as any,
      bornAgain: formData.bornAgain as any,
      status: serviceIdToUse ? 'Checked In' : 'Absent',
      checkInTime: serviceIdToUse ? new Date().toISOString() : undefined,
      joinedDate: new Date().toISOString().split('T')[0],
      attendedServiceIds: serviceIdToUse ? [serviceIdToUse] : [],
      residency: formData.residence,
      email: formData.email,
      occupation: formData.occupation,
      placeOfWork: formData.placeOfWork,
      currentServiceId: serviceIdToUse,
      isPhanerooMember: formData.isPhanerooMember as any,
      referralSource: formData.referralSource
    };

    try {
      const response = await MemberStore.add(newMember);

      // FIX: Map backend response (snake_case) to frontend Member (camelCase)
      // This ensures we have the REAL ID for check-in validation
      const realMember: Member = {
        ...newMember, // Keep optimistic values as defaults
        id: response.id || newMember.id, // CRITICAL: Use backend ID
        category: response.category || newMember.category,
        // Map snake_case from DB if present
        checkInTime: response.check_in_time || newMember.checkInTime,
        bornAgain: response.born_again !== undefined ? response.born_again : newMember.bornAgain,
        joinedDate: response.joined_date || newMember.joinedDate,
        attendedServiceIds: response.attended_service_ids || newMember.attendedServiceIds,
        // Status might be updated by backend logic
        status: response.status || newMember.status
      };

      if (autoSavedEvent) {
        showToast("Event saved automatically. Member successfully checked in.", "success");
      } else if (response?._meta?.ignored_service_ids?.length > 0) {
        showToast(`Registered ${newMember.name}, but ignored temporary Event ID.`, 'warning');
      } else if (isServiceActive && serviceIdToUse) {
        showToast(`${newMember.name} registered and checked in!`, 'success');
      } else {
        showToast(`${newMember.name} added to database.`, 'success');
      }

      if (isServiceActive && selectedService) { // Use selectedService (which might be stale, but we used serviceIdToUse logic)
        // If we auto-saved, stats need fetching for the NEW ID
        const sid = serviceIdToUse || selectedService.id;
        const sdate = autoSavedEvent?.date || selectedService.date;

        // CRITICAL FIX: Explicitly guarantee check-in through the dedicated Express endpoint
        // The RPC 'submit_member_entry' JSONB regex parser has a known bug silently failing attendance inserts.
        if (sid) {
          await MemberStore.checkIn(realMember.id, sid);
        }

        // Fetch fresh stats
        try {
          // Delay slightly to ensure DB consistency if needed, but usually immediate is fine
          const stats = await MemberStore.getServiceStats(sid, sdate);
          const childrenCount = selectedService.stats?.manualChildrenCount || 0;
          setCheckInStats({ total: stats.total + childrenCount, firstTimers: stats.firstTimers });
          setCheckedInIds(new Set(stats.memberIds));
        } catch (statErr) {
          console.warn("Failed to refresh stats after auto-save", statErr);
        }
      } else {
        setViewMode('list');
      }

      // Update filtered list with REAL member (uniques only)
      setMembers(prev => {
        // Remove if existing ID (merge case)
        const filtered = prev.filter(m => m.id !== realMember.id);
        return [realMember, ...filtered];
      });

      setFormData(initialForm);

    } catch (err: any) {
      console.error("Registration Error:", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : "Failed to register member.");

      if (errorMessage.toLowerCase().includes('already exists')) {
        showToast(errorMessage, 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleCheckInMember = async (memberId: string) => {
    if (!selectedService) return;

    let serviceToUse = selectedService;

    // AUTO-SAVE: If event is temporary, save it first
    if (selectedService.id.startsWith('evt-')) {
      try {
        showToast("Saving new event before check-in...", "info");
        const realEvent = await EventStore.add(selectedService);
        setSelectedService(realEvent);
        serviceToUse = realEvent;
      } catch (e) {
        console.error("Auto-save failed", e);
        showToast("Failed to save temporary event. Check-in aborted.", "error");
        return;
      }
    }

    try {
      // 1. Optimistic UI Updates - INSTANT FEEDBACK
      // Add member to local checked-in set to immediately hide the button
      setCheckedInIds(prev => {
        const next = new Set(prev);
        next.add(memberId);
        return next;
      });

      // Optimistically increment check-in totals
      setCheckInStats(prev => ({
        ...prev,
        total: prev.total + 1
      }));

      // Update the local member object for UI badges/lists
      setMembers(prev => prev.map(m => m.id === memberId ? {
        ...m,
        status: 'Checked In',
        checkInTime: new Date().toLocaleTimeString()
      } : m));

      // Clear the search query to allow immediate next search
      setSearchQuery('');

      // 2. Perform Backend Request
      const res = await MemberStore.checkIn(memberId, serviceToUse.id);

      // Warning for ignored temp IDs (Should not happen now if auto-save worked, but valid safeguard)
      if (res?._meta?.ignored_service_ids?.length > 0) {
        showToast("Check-in skipped for temporary event. Please save event first.", "warning");
      } else {
        showToast("Member Checked In Successfully", "success");
      }

      // Note: Stats are updated automatically via idempotent Realtime listeners for parallel devices
    } catch (error: any) {
      console.error("Check-in Error:", error);

      // Rollback Optimistic UI on failure
      setCheckedInIds(prev => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
      setCheckInStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));
      setMembers(prev => prev.map(m => m.id === memberId ? {
        ...m,
        status: 'Member', // Assuming default is 'Member', might need exact prior state in edge cases
        checkInTime: undefined
      } : m));

      const msg = error.message || "Check-in failed";
      if (msg.includes('Please save the event')) {
        showToast(msg, 'warning');
      } else {
        showToast(msg, 'error');
      }
    }
  };

  const handleUndoCheckInMember = async (memberId: string) => {
    if (!selectedService) return;

    // Check elevated permissions
    const elevatedRoles = ['Administrator', 'Head of Dept', 'Department Head', 'Dept Admin', 'Reg. Admin', 'Registration Admin', 'Registration Head'];
    if (!elevatedRoles.includes(currentUser.role)) {
      showToast("You do not have permission to undo check-ins.", "warning");
      return;
    }

    // Must confirm undo checkin
    if (!(await askConfirm("Undo Check-In?", "Are you sure you want to remove this member's check-in record for this service?"))) {
      return;
    }

    try {
      // 1. Optimistic UI Updates
      setCheckedInIds(prev => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });

      setCheckInStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));

      setMembers(prev => prev.map(m => m.id === memberId ? {
        ...m,
        status: 'Member',
        checkInTime: undefined
      } : m));

      // 2. Platform Request
      await MemberStore.undoCheckIn(memberId, selectedService.id);
      showToast("Check-In reversed successfully", "success");

      // Auto-refresh stats to ensure FirstTimer counts also sync perfectly
      try {
        const stats = await MemberStore.getServiceStats(selectedService.id, selectedService.date);
        const childrenCount = selectedService.stats?.manualChildrenCount || 0;
        setCheckInStats({ total: stats.total + childrenCount, firstTimers: stats.firstTimers });
      } catch (e) {
        // silent fail on auto-refresh
      }

    } catch (error: any) {
      console.error("Undo Check-in Error:", error);

      // Rollback UI
      setCheckedInIds(prev => {
        const next = new Set(prev);
        next.add(memberId);
        return next;
      });
      setCheckInStats(prev => ({
        ...prev,
        total: prev.total + 1
      }));
      setMembers(prev => prev.map(m => m.id === memberId ? {
        ...m,
        status: 'Checked In',
        checkInTime: new Date().toLocaleTimeString()
      } : m));

      showToast(error.message || "Failed to undo check-in", "error");
    }
  };

  // --- MEMBER DETAILS & EDIT ---
  const handleViewMember = async (memberId: string) => {
    try {
      const details = await MemberStore.getMemberDetails(memberId);
      setSelectedMemberDetails(details);
      setFormData(details.member as any); // Pre-fill form for potential editing
      setIsEditingMember(false); // Start in View-only mode
      setViewMode('member-detail');
    } catch (e) {
      console.error("Error viewing member:", e);
      showToast("Could not load member details.", 'error');
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only run update logic if in editing mode
    if (!selectedMemberDetails) return;

    try {
      const updatedMember = {
        ...selectedMemberDetails.member,
        ...formData,
        id: selectedMemberDetails.member.id // Ensure ID doesn't change
      };
      await MemberStore.update(updatedMember);
      setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));

      // Refresh details
      const details = await MemberStore.getMemberDetails(updatedMember.id);
      setSelectedMemberDetails(details);
      setIsEditingMember(false);
      setSelectedMemberDetails(details);
      setIsEditingMember(false);
      showToast("Member updated successfully.", 'success');
    } catch (e) {
      console.error("Update failed", e);
      showToast("Failed to update member.", 'error');
    }
  };

  // --- PARKING HANDLERS ---
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;

    // Contact Confirmation
    if (!vehicleForm.driverContact || vehicleForm.driverContact === '256' || vehicleForm.driverContact.length <= 3) {
      if (!(await askConfirm("Missing Driver Contact", "No driver contact provided. Are you sure you want to proceed?"))) {
        return;
      }
    }

    // 1. Validate Plate Format
    const { valid, formatted } = validatePlate(vehicleForm.number_plate);
    if (!valid) {
      showToast(`Invalid Number Plate Format: "${vehicleForm.number_plate}".\nAllowed formats: UAA 123A or UA 123AA (e.g. UBA 123A)`, 'error');
      return;
    }

    // 1b. Validate Driver Identity (NIN / Permit)
    const idValidation = validateDriverIdentity(vehicleForm.driverNin);
    if (!idValidation.valid) {
      showToast(`Driver ID Error: ${idValidation.error}`, 'error');
      return;
    }

    // 1c. Validate Coordinator Uniqueness
    if (vehicleForm.coordinator) {
      const existingCoordVehicle = vehicles.find(v =>
        v.coordinator === vehicleForm.coordinator &&
        v.id !== (vehicleForm.id || '') // Exclude self if updating
      );
      if (existingCoordVehicle) {
        showToast(`Error: Coordinator "${vehicleForm.coordinator}" is already assigned to vehicle ${existingCoordVehicle.number_plate}`, 'error');
        return;
      }
    }

    // 2. Check Duplicates (Event Scope - One car cannot be active TWICE in the SAME event)
    const duplicate = vehicles.find(v =>
      v.number_plate === formatted &&
      v.id !== vehicleForm.id // Exclude self if updating
    );

    if (duplicate) {
      // Check if duplicate is in the SAME EVENT
      const duplicateStation = stations.find(s => s.id === duplicate.stationId);
      const currentStation = selectedStation; // We are always adding to selectedStation

      if (duplicateStation && duplicateStation.eventId === currentStation.eventId) {
        showToast(`Error: Vehicle "${formatted}" is already registered in this event (Station: ${duplicateStation.name}).`, 'error');
        return;
      }
      // If it exists but in a DIFFERENT event, we allow it (assuming user is creating a new deployment for this event)
    }

    // 3. Handle Update Logic (if ID exists)
    if (vehicleForm.id) {
      try {
        // Find existing vehicle to preserve other fields
        const existingVehicle = vehicles.find(v => v.id === vehicleForm.id) || selectedVehicle;
        if (!existingVehicle) throw new Error("Vehicle not found");

        const updatedVehicle: Partial<Vehicle> & { id: string } = {
          id: existingVehicle.id,
          number_plate: formatted,
          driverName: vehicleForm.driverName,
          driverContact: vehicleForm.driverContact,
          driverNin: vehicleForm.driverNin,
          type: vehicleForm.type,
          coordinator: vehicleForm.coordinator || currentUser.name,
          stationId: selectedStation.id,
          eventId: selectedStation.eventId,
        };

        await VehicleStore.updateVehicle(updatedVehicle);

        // Update Local State
        setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? { ...v, ...updatedVehicle } as Vehicle : v));
        if (selectedVehicle && selectedVehicle.id === updatedVehicle.id) {
          setSelectedVehicle({ ...selectedVehicle, ...updatedVehicle } as Vehicle);
        }

        showToast("Vehicle Updated Successfully", 'success');
        setIsAddVehicleOpen(false);
        setVehicleForm({
          number_plate: '',
          driverName: '',
          driverContact: '256',
          type: 'Taxi',
          driverNin: '',
          coordinator: '',
          id: ''
        });
        // refreshData(); // Removed in favor of local state update and Realtime sync
      } catch (error: any) {
        console.error("Update failed", error);
        showToast(`Failed to update vehicle: ${error.message || 'Unknown error'}`, 'error');
      }
      return;
    }

    try {
      const newVehicleId = uuidv4();
      const newVeh: Vehicle = {
        ...vehicleForm,
        id: newVehicleId,
        number_plate: formatted,
        stationId: selectedStation.id,
        eventId: selectedStation.eventId,
        coordinator: vehicleForm.coordinator || currentUser.name,
        approvals: { registration: 'Pending', finance: 'Pending' } as any,
        currentStage: 'Onboarding' as any
      };

      const res = await VehicleStore.addVehicle(newVeh);

      if (res.status === 'error') {
        throw new Error(res.message || "Failed to add vehicle");
      }

      const createdVeh = res.data || newVeh;
      setVehicles(prev => [...prev, createdVeh]);
      showToast("Vehicle Added Successfully", 'success');
      setIsAddVehicleOpen(false);
      setVehicleForm({
        number_plate: '',
        driverName: '',
        driverContact: '256',
        type: 'Taxi',
        driverNin: '',
        coordinator: '',
        id: ''
      });
      // refreshData(); // Removed in favor of local state update and Realtime sync
    } catch (e) {
      console.error(e);
      showToast("Failed to add vehicle", 'error');
    }
  };

  const handleParkingAction = async (car: PersonalVehicle, action: 'Check In' | 'Check Out') => {
    if (action === 'Check In' && !selectedService) {
      showToast("Please select an Active Service first (go to Check-in tab and select a service)", 'warning');
      return;
    }
    try {
      const storeStatus = action === 'Check In' ? 'Checked In' : 'Checked Out';
      await VehicleStore.updatePersonalVehicleStatus(car.id, storeStatus, selectedService?.id);
      setPersonalVehicles(prev => prev.map(c => c.id === car.id ? {
        ...c,
        status: action === 'Check In' ? 'Checked In' : 'Checked Out',
        checkInTime: action === 'Check In' ? new Date().toISOString() : c.checkInTime,
        currentServiceId: action === 'Check In' ? selectedService?.id : c.currentServiceId
      } : c));
    } catch (error) {
      showToast("Failed to update status", 'error');
    }
  };

  // --- BULK IMPORT & DELETE ---
  const handleBulkMemberImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkMemberText.split('\n');
    const membersToImport: Member[] = [];
    const seenMembers = new Set<string>(); // For deduplication

    setIsImporting(true);
    setImportProgress(0);

    // 1. Parse Logic and Deduplicate
    for (const line of lines) {
      if (!line.trim()) continue;

      const delimiter = line.includes('\t') ? '\t' : ',';
      const parts = line.split(delimiter);

      if (parts.length >= 2) {
        const name = parts[0].trim();
        const residence = parts[1]?.trim() || '';
        const phone = parts[2]?.trim() || '';
        const genderRaw = parts[3]?.trim() || 'Male';

        const gender = (genderRaw.toLowerCase().startsWith('f') ? 'Female' : 'Male') as 'Male' | 'Female';

        if (name) {
          const uniqueKey = `${name.toLowerCase()}-${phone.replace(/\D/g, '')}`; // Name + cleaned phone for uniqueness
          if (seenMembers.has(uniqueKey)) {
            console.warn(`Skipping duplicate member: ${name} (${phone})`);
            continue;
          }
          seenMembers.add(uniqueKey);

          const newMember: Member = {
            id: uuidv4(), // Client-side ID, will be replaced by server if server generates
            name,
            phone,
            category: 'Member',
            residency: residence,
            gender: gender,
            status: 'Absent',
            joinedDate: new Date().toISOString().split('T')[0],
            attendedServiceIds: [],
            bornAgain: 'No',
            isPhanerooMember: 'Yes'
          };
          membersToImport.push(newMember);
        }
      }
    }

    // 2. Upload in Batches
    const BATCH_SIZE = 50;
    if (membersToImport.length > 0) {
      try {
        let processed = 0;
        const total = membersToImport.length;

        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = membersToImport.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(m => MemberStore.add(m)));

          processed += batch.length;
          setImportProgress(Math.round((processed / total) * 100));
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Refresh members from the server after successful import
        const fetchedMembers = await MemberStore.getAll();
        if (fetchedMembers.status === 'success') {
          setMembers(fetchedMembers.data);
        } else {
          throw new Error(fetchedMembers.message || "Failed to fetch members after import.");
        }

        setBulkMemberText('');
        setIsImporting(false);
        showToast(`${processed} members imported successfully.`, 'success');
        setViewMode('list');
      } catch (err: any) {
        console.error("Bulk Import Error:", err);
        setIsImporting(false);
        showToast("Error importing members: " + err.message, 'error');
      }
    } else {
      setIsImporting(false);
      showToast("No valid or unique records found to import. Please check format.", 'error');
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
      // Order: Name | Residence | Contact | Gender
      let text = '';
      jsonData.forEach((row, index) => {
        // Skip header if detected (assuming "Name" is in first column)
        if (index === 0 && typeof row[0] === 'string' && row[0].toLowerCase().includes('name')) return;

        // Assumed Excel Order: Name | Residence | Contact | Gender
        const name = row[0] || '';
        const residence = row[1] || '';
        const contact = row[2] || '';
        const gender = row[3] || 'Male';

        if (name) {
          text += `${name}\t${residence}\t${contact}\t${gender}\n`;
        }
      });
      setBulkMemberText(text);
    } else {
      // Fallback for CSV/Text
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setBulkMemberText(text);
      };
      reader.readAsText(file);
    }
  };

  // --- ADD EVENT / SERVICE Logic ---
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newEvent: MinistryEvent = {
        id: uuidv4(),
        title: eventForm.title,
        type: eventFormType,
        date: eventForm.date,
        time: eventForm.time,
        location: eventForm.location,
        description: eventForm.description,
        serviceNumber: 1, // Default for new events (DB requires it, 1 is safer than 0)
        stats: { attendees: 0, firstTimers: 0, soulsWon: 0, students: 0, expenditure: '$0.00', nextGen: 0 }
      };

      await EventStore.add(newEvent);
      if (refreshParentData) refreshParentData(); // Refresh parent data
      setIsAddEventOpen(false);
      setEventForm({ title: '', date: new Date().toISOString().split('T')[0], time: '17:00', location: 'Phaneroo Grounds', description: '' });
      showToast(`${eventFormType} created successfully.`, 'success');
    } catch (error: any) {
      console.error("Error creating event:", error);
      showToast("Failed to create event: " + error.message, 'error');
    }
  };



  const filteredMembers = members.filter(m => {
    // 0. Stats Card Filter (Drill-down)
    // Only apply filterCategory if we are in the Check-In tab
    const isCheckInTab = activeTab === 'checkin';
    const effectiveFilterCategory = isCheckInTab ? filterCategory : null;

    if (effectiveFilterCategory) {
      // Must be checked in - (Essential to prevent showing all members if fetch fallback occurs)
      if (!checkedInIds.has(m.id)) return false;

      // If specific category
      if (effectiveFilterCategory !== 'CHECKED_IN_ALL' && m.category !== effectiveFilterCategory) return false;
    }

    const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const name = m.name.toLowerCase();
    const phoneRaw = m.phone || '';
    const phoneClean = phoneRaw.replace(/\D/g, ''); // Strip non-digits from stored phone

    return tokens.every(token => {
      // 1. Check Name (Standard)
      if (name.includes(token)) return true;

      // 2. Check Phone (Flexible)
      // Strip non-digits from token to handle "123-456" input or just "123"
      const tokenClean = token.replace(/\D/g, '');
      // Only check phone if token has digits (prevents "John" matching empty string)
      if (tokenClean.length > 0 && phoneClean.includes(tokenClean)) return true;

      return false;
    });
  }).sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    // If one has createdAt (new) and other doesn't (old), new comes first
    if (a.createdAt) return -1;
    if (b.createdAt) return 1;
    // Fallback: Name
    return a.name.localeCompare(b.name);
  });

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMemberIds(new Set(filteredMembers.map(m => m.id)));
    } else {
      setSelectedMemberIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedMemberIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedMemberIds(newSet);
  };

  const handleDeleteSelected = () => {
    setIsDeleteModalOpen(true);
  };



  // --- LOGISTICS LOGIC ---
  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogisticsEvent) return;

    // Contact Confirmation - REMOVED
    // if (!stationForm.coordinatorContact || stationForm.coordinatorContact === '256' || stationForm.coordinatorContact.length <= 3) {
    //   if (!(await askConfirm("Missing Coordinator Contact", "No coordinator contact provided. Are you sure you want to proceed?"))) {
    //     return;
    //   }
    // }

    if (stationForm.entrantUsername) {
      const result = await UserStore.getAll();
      if (result.status === 'success') {
        // Check for duplicates, but exclude current entrant if editing
        const duplicate = result.data.find(u =>
          u.username?.toLowerCase() === stationForm.entrantUsername.toLowerCase() &&
          (!stationForm.id || (stationEntrants[0] && u.id !== stationEntrants[0].id))
        );

        if (duplicate) {
          showToast(`The username "${stationForm.entrantUsername}" is already taken.`, 'error');
          return;
        }
      }
    }

    // UPDATE LOGIC
    if (stationForm.id) {
      const updatedStation: ExtendedStation = {
        ...selectedStation!, // Keep existing props
        name: stationForm.name,
        location: stationForm.location,
        coordinatorName: stationForm.coordinatorName,
        coordinatorContact: stationForm.coordinatorContact,
        dataEntrantName: stationForm.entrantName || selectedStation!.dataEntrantName
      };

      try {
        const updateRes = await LogisticsStore.updateStation(updatedStation);
        if (updateRes.status === 'error') throw new Error(updateRes.message);

        // Update Entrant if info provided
        if (stationForm.entrantName && stationForm.entrantUsername && stationForm.entrantPassword) {
          // Check if entrant exists for this station
          const existingEntrant = stationEntrants[0];

          if (existingEntrant) {
            const updatedUser: User = {
              ...existingEntrant,
              name: stationForm.entrantName,
              username: stationForm.entrantUsername,
              password: stationForm.entrantPassword,
              contact: stationForm.coordinatorContact // Optional: sync contact or keep separate? Let's keep separate usually but here we just update creds.
            };
            const updateRes = await UserStore.update(updatedUser);
            if (updateRes.status === 'error') throw new Error(updateRes.message);
          } else {
            // Create new if none existed but added in edit
            const newEntrant: User = {
              id: uuidv4(),
              name: stationForm.entrantName,
              username: stationForm.entrantUsername,
              password: stationForm.entrantPassword,
              role: 'Logistics',
              stationId: stationForm.id,
              departmentId: '4630e48a-f97e-48fd-a901-864b591c282f' // Transportation UUID
            };
            const addRes = await UserStore.add(newEntrant);
            if (addRes.status === 'error') throw new Error(addRes.message);
          }
        }

        // Update local state
        setStations(stations.map(s => s.id === stationForm.id ? updatedStation : s));
        setIsAddStationOpen(false);
        setStationForm(initialStationForm);
        showToast("Station and User updated successfully.", 'success');

        // Refresh entrants list if we are still viewing this station
        if (selectedStation && selectedStation.id === stationForm.id) {
          const result = await UserStore.getAll();
          if (result.status === 'success') {
            setStationEntrants(result.data.filter(u => u.role === 'Logistics' && u.stationId === stationForm.id));
          }
        }

      } catch (err: any) {
        showToast("Error updating station: " + err.message, 'error');
      }
      return;
    }

    // CREATE LOGIC
    const stationId = uuidv4();
    const newStation: ExtendedStation = {
      id: stationId,
      name: stationForm.name,
      location: stationForm.location,
      registeredAttendees: 0,
      vehicleStatus: 'Pending',
      eventId: selectedLogisticsEvent.id,
      coordinatorName: stationForm.coordinatorName,
      coordinatorContact: stationForm.coordinatorContact,
      dataEntrantName: stationForm.entrantName
    };

    try {
      const res = await LogisticsStore.addStation(newStation);
      if (res.status === 'error') throw new Error(res.message || "Failed to add station");

      if (stationForm.entrantName && stationForm.entrantUsername && stationForm.entrantPassword) {
        const newEntrant: User = {
          id: uuidv4(),
          name: stationForm.entrantName,
          username: stationForm.entrantUsername,
          password: stationForm.entrantPassword,
          role: 'Logistics',
          stationId: stationId,
          departmentId: '4630e48a-f97e-48fd-a901-864b591c282f' // Transportation UUID
        };
        const addRes = await UserStore.add(newEntrant);
        if (addRes.status === 'error') {
          throw new Error(`Station created, but Entrant failed: ${addRes.message}`);
        }
      }
      setStations([...stations, newStation]);
      setIsAddStationOpen(false);
      setStationForm(initialStationForm);
      showToast("Station created successfully.", 'success');
    } catch (err: any) {
      showToast(err.message || "Error creating station", 'error');
    }
  };


  const handleAddExtraEntrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;

    // Basic Validation
    if (!newEntrant.name || !newEntrant.username || !newEntrant.password) {
      showToast("All fields are required.", 'warning');
      return;
    }

    const newUser: User = {
      id: uuidv4(),
      name: newEntrant.name,
      username: newEntrant.username,
      password: newEntrant.password,
      role: 'Logistics',
      stationId: selectedStation.id,
      departmentId: currentUser.departmentId || '4630e48a-f97e-48fd-a901-864b591c282f' // Default to current user's department or Transportation UUID
    };

    try {
      const res = await UserStore.add(newUser);
      if (res.status === 'error') throw new Error(res.message);

      setIsAddEntrantOpen(false);
      setNewEntrant({ name: '', username: '', password: '' });
      showToast("Data entrant added successfully.", 'success');

      // Update local state so it appears immediately
      const result = await UserStore.getAll();
      if (result.status === 'success') {
        setStationEntrants(result.data.filter(u => u.role === 'Logistics' && u.stationId === selectedStation.id));
      } else {
        // Fallback if getAll fails
        setStationEntrants(prev => [...prev, newUser]);
      }
    } catch (error: any) {
      showToast("Error adding entrant: " + error.message, 'error');
    }
  };





  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    if (selectedVehicle.approvals?.registration === 'Approved') {
      showToast("This vehicle is locked (Registration Approved). No more passengers can be added.", 'info');
      return;
    }

    // Check for duplicates (exclude self if editing)
    const normalizedName = passengerForm.name.trim().toLowerCase();
    const isDuplicate = passengers.some(p =>
      p.vehicleId === selectedVehicle.id &&
      p.name.trim().toLowerCase() === normalizedName &&
      p.id !== (passengerForm.id || '')
    );

    if (isDuplicate) {
      showToast(`${passengerForm.name} is already in this vehicle.`, 'warning');
      return;
    }

    // Contact Logic: Check if "Parent Contact" was selected
    let finalContact = passengerForm.contact;
    let finalParentContact = passengerForm.parentContact;

    // Use type casting to check the temporary UI flag we added
    if ((passengerForm as any).isParentContact === true) {
      finalParentContact = passengerForm.contact; // The input value goes to parentContact
      finalContact = '256'; // Default placeholder for Contact if Parent Contact is used
    }

    // Contact Confirmation (Hardened)
    // Contact Confirmation (Hardened)
    const isContactEmpty = !finalContact || finalContact === '256' || finalContact.length <= 3;
    const isParentContactEmpty = !finalParentContact || finalParentContact === '256' || finalParentContact.length <= 3;

    if (isContactEmpty && isParentContactEmpty) {
      if (!(await askConfirm("Missing Contact Info", "No contact number entered. Are you sure you want to proceed?"))) {
        return;
      }
    }
    const resolvedEventId = selectedVehicle.eventId
      || stations.find(s => s.id === selectedVehicle.stationId)?.eventId
      || selectedLogisticsEvent?.id
      || selectedService?.id;

    if (!resolvedEventId) {
      console.error("CRITICAL: No Event ID resolved!", {
        vehicleEventId: selectedVehicle.eventId,
        stationEventId: stations.find(s => s.id === selectedVehicle.stationId)?.eventId,
        logisticsEventId: selectedLogisticsEvent?.id,
        serviceId: selectedService?.id,
        vehicleStationId: selectedVehicle.stationId
      });
      showToast("System Error: Could not determine current Event. Please refresh.", 'error');
      return;
    }

    const payload: Passenger = {
      ...passengerForm,
      id: passengerForm.id || uuidv4(), // Use existing ID if editing
      vehicleId: selectedVehicle.id,
      eventId: resolvedEventId,
      stationId: selectedVehicle.stationId, // Added station linkage
      contact: sanitize(finalContact) || '256',
      parentContact: sanitize(finalParentContact),
      residence: sanitize(passengerForm.residence) || '',
      gender: passengerForm.gender as 'Male' | 'Female',
      school: sanitize(passengerForm.school),
      studentClass: sanitize(passengerForm.studentClass),
      boardingType: passengerForm.boardingType as 'Day' | 'Boarding',
      soulWon: passengerForm.soulWon // Default handled in store if needed, or pass correctly
    };

    try {
      if (passengerForm.id) {
        // UPDATE MODE
        const updatePayload: Partial<Passenger> & { id: string } = {
          id: passengerForm.id,
          name: passengerForm.name,
          category: passengerForm.category as 'Member' | 'Student' | 'Institution',
          contact: passengerForm.contact,
          residence: passengerForm.residence,
          isFirstTime: passengerForm.isFirstTime ? 'Yes' : 'No',
          school: passengerForm.school,
          studentClass: passengerForm.studentClass,
          boardingType: passengerForm.boardingType as 'Day' | 'Boarding',
          gender: passengerForm.gender as 'Male' | 'Female',
          soulWon: passengerForm.soulWon
        };

        await VehicleStore.updatePassenger(updatePayload);
        setPassengers(prev => prev.map(p => p.id === updatePayload.id ? { ...p, ...updatePayload } as Passenger : p));
        showToast("Passenger updated successfully", 'success');
      } else {
        // CREATE MODE
        const res = await VehicleStore.addPassenger(payload);
        const createdPassenger = (res.status === 'success' && res.data) ? res.data : payload;
        setPassengers(prev => [...prev, createdPassenger]);
        showToast("Passenger added successfully", 'success');
      }

      setIsAddPassengerOpen(false);
      setPassengerForm({
        name: '',
        contact: '256',
        category: 'Member',
        residence: '',
        isFirstTime: 'No',
        verified: 'No',
        school: '',
        studentClass: '',
        boardingType: 'Day',
        gender: 'Male',
        parentContact: '',
        soulWon: 'No',
        id: '' // Reset ID
      });
      // refreshData(); // Removed in favor of local state update and Realtime sync
    } catch (error: any) {
      console.error("Failed to save passenger:", error);
      showToast(passengerForm.id ? "Failed to update passenger" : "Failed to add passenger", 'error');
    }
  };

  const openAddMember = () => {
    setPassengerForm({ ...initialPassengerForm, category: 'Member' });
    setIsAddPassengerOpen(true);
  };

  const openAddStudent = () => {
    setPassengerForm({ ...initialPassengerForm, category: 'Student' });
    setIsAddPassengerOpen(true);
  };

  const openAddInstitution = () => {
    setPassengerForm({ ...initialPassengerForm, category: 'Institution' });
    setIsAddPassengerOpen(true);
  };

  const handleDeletePassenger = async (passengerId: string) => {
    if (await askConfirm("Remove Passenger", "Are you sure you want to remove this passenger from the vehicle?")) {
      try {
        // Optimistic update: remove from UI immediately
        setPassengers(prev => prev.filter(p => p.id !== passengerId));
        // Then call API
        await VehicleStore.deletePassenger(passengerId);
      } catch (error) {
        console.error("Error deleting passenger", error);
        // Fallback: If DB delete fails, maybe reload to get correct state or alert user
        showToast("Could not delete from database. Please refresh.", 'error');
      }
    }
  };

  /* 
   * Updated Approval Logic:
   * Moves vehicle from Registration -> Finance Approval
   */
  const handleApproveVehicle = async () => {
    if (!selectedVehicle) return;

    if (await askConfirm("Approve Vehicle", `Are you sure you want to approve vehicle ${selectedVehicle.number_plate} and send it to Finance?`)) {
      try {
        const nextStage = 'FinanceApproval';
        const updatedApprovals = {
          registration: 'Approved',
          finance: selectedVehicle.approvals?.finance || 'Pending'
        };

        // Targeted Update in DB (Safer than full update)
        const updatedFromDB = await VehicleStore.updateVehicleStage(selectedVehicle.id, nextStage, updatedApprovals, {
          version: selectedVehicle.version
        });

        // Construct updated object for local state (Using server response is best)
        const updatedVehicle: Vehicle = {
          ...selectedVehicle,
          ...updatedFromDB, // Sync all server-side changes including new version
          currentStage: nextStage as any,
          approvals: updatedApprovals as any
        };

        // Update Local State directly
        setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
        setSelectedVehicle(updatedVehicle);

        showToast("Vehicle successfully approved and sent to Finance Dashboard.", 'success');
      } catch (err: any) {
        console.error("Error approving vehicle:", err);
        showToast("Failed to approve vehicle: " + err.message, 'error');
      }
    }
  };

  const handleUpdateChildrenCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      const count = parseInt(childrenForm.count) || 0;
      await VehicleStore.updateChildrenCount(selectedVehicle.id, count);

      const updatedVehicle = { ...selectedVehicle, childrenCount: count };
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
      setSelectedVehicle(updatedVehicle);
      setIsAddChildrenOpen(false);

      showToast("Children count updated.", 'success');
      // refreshData(); // Removed in favor of local state update and Realtime sync
    } catch (err) {
      console.error("Error updating children count", err);
      showToast("Failed to update children count.", 'error');
    }
  };

  const handleDeleteStation = async () => {
    if (!selectedStation) return;
    if (await askConfirm("Delete Station", `Are you sure you want to delete ${selectedStation.name}?\n\nWARNING: This will delete ALL vehicles, passengers, and data entrants associated with this station!`)) {
      try {
        await LogisticsStore.deleteStation(selectedStation.id);
        setStations(prev => prev.filter(s => s.id !== selectedStation.id));
        setVehicles(prev => prev.filter(v => v.stationId !== selectedStation.id)); // Cleanup local vehicles
        setSelectedStation(null); // Go back
        showToast("Station deleted successfully.", 'success');
      } catch (err: any) {
        console.error("Error deleting station:", err);
        showToast("Failed to delete station.", 'error');
      }
    }
  };

  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) return;
    if (await askConfirm("Delete Vehicle", `Are you sure you want to delete ${selectedVehicle.number_plate}?\n\nWARNING: This will delete ALL passengers in this vehicle!`)) {
      try {
        await VehicleStore.deleteVehicle(selectedVehicle.id);
        setVehicles(prev => prev.filter(v => v.id !== selectedVehicle.id));
        setSelectedVehicle(null); // Go back
        showToast("Vehicle deleted successfully.", 'success');
      } catch (err: any) {
        console.error("Error deleting vehicle:", err);
        showToast("Failed to delete vehicle.", 'error');
      }
    }
  };



  const confirmDelete = async () => {
    // 1. Password Check
    const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username || currentUser.email,
          password: deletePassword
        })
      });

      if (!response.ok) {
        // Fallback check against local DB cache just in case the server is unreachable 
        // or user exists solely in the legacy table state
        if (deletePassword !== currentUser.password) {
          showToast("Incorrect Password", 'error');
          return;
        }
      }
    } catch (err) {
      if (deletePassword !== currentUser.password) {
        showToast("Incorrect Password", 'error');
        return;
      }
    }

    // 2. Handle Event/Service Deletion
    if (eventToDelete) {
      try {
        await EventStore.delete(eventToDelete.id);
        setIsDeleteModalOpen(false);
        setDeletePassword('');
        setEventToDelete(null);
        window.location.reload(); // Hard reload
      } catch (err: any) {
        console.error("Error deleting event:", err);
        showToast(`Failed to delete event: ${err.message || 'Unknown error'}`, 'error');
      }
      return;
    }

    // 3. Handle Bulk Member Deletion (Existing Logic)
    try {
      const idsToDelete = Array.from(selectedMemberIds) as string[];
      await MemberStore.delete(idsToDelete);

      // Update UI
      setMembers(prev => prev.filter(m => !selectedMemberIds.has(m.id)));
      setTotalMembers(prev => prev - idsToDelete.length);
      setSelectedMemberIds(new Set());
      setIsDeleteModalOpen(false);
      setDeletePassword('');
      showToast(`Successfully deleted ${idsToDelete.length} members.`, 'success');
    } catch (err) {
      console.error("Error deleting members:", err);
      showToast("Failed to delete members.", 'error');
    }
  };



  const handleDeleteEvent = async (event: MinistryEvent) => {
    // Strict Guard
    const canDeleteEvent = currentUser.role === 'TeamLeader';
    if (!canDeleteEvent) {
      showToast("Access Denied: Only Team Leader can delete events/services.", 'error');
      return;
    }

    // Initial Warning (Still good to have before asking for password)
    if (await askConfirm("Delete Service/Event", `Are you sure you want to delete "${event.title}"?\n\nWARNING: This will delete ALL associated Pickup Stations, Vehicles, and Passengers.\n\nAttendance histories will be unlinked (preserved on member verification, but removed from this event).\n\nContinue to Password Verification?`)) {
      setEventToDelete(event);
      setIsDeleteModalOpen(true);
    }
  };


  const handleUpdateManualCount = async (count: number) => {
    if (!selectedService) return;

    try {
      // Update local state for immediate feedback
      const updatedService = {
        ...selectedService,
        stats: {
          ...selectedService.stats,
          manualChildrenCount: count
        }
      };
      setSelectedService(updatedService);

      // Update Database
      await EventStore.update(updatedService);

      // Update UI Stats immediately
      const memberStats = await MemberStore.getServiceStats(selectedService.id, selectedService.date);
      setCheckInStats({
        total: memberStats.total + count, // Updates total immediately
        firstTimers: memberStats.firstTimers
      });

      showToast(`Children count updated to ${count}`, 'success');
    } catch (error) {
      console.error("Failed to update manual count", error);
      showToast("Failed to update count. Please try again.", 'error');
    }
  };

  const handleCopyReport = async () => {
    if (!selectedService) return;

    // 1. Calculate Service Number
    const getServiceNumber = () => {
      const day = new Date(selectedService.date).getDay(); // 0 = Sunday, 4 = Thursday
      const isThursday = day === 4;
      const isSunday = day === 0;

      if (!isThursday && !isSunday) return ""; // Only for Sun/Thu

      // SEED LOGIC: Explicitly set numbers for specific start dates
      if (selectedService.date === '2026-01-25') return "376";
      if (selectedService.date === '2026-01-22') return "566";

      // Filter events for the same day of week, BEFORE current date
      const validPreviousServices = events
        .filter(e => e.type === 'Service' && e.id !== selectedService.id) // Services only
        .filter(e => {
          const eDay = new Date(e.date).getDay();
          const eDate = new Date(e.date);
          const currentDate = new Date(selectedService.date);
          // Same weekday (0 or 4) AND date is before current
          return eDay === day && eDate < currentDate;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending (newest first)

      const lastService = validPreviousServices[0];

      if (!lastService) return "1"; // Default if none found

      // Extract number from previous title (e.g. S376 -> 376, or #566 -> 566)
      const match = lastService.title.match(/S(\d+)/i) || lastService.title.match(/(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1]);
        return (num + 1).toString();
      }

      // If title didn't have number, check if the PREVIOUS service was a seed date
      if (lastService.date === '2026-01-25') return "377";
      if (lastService.date === '2026-01-22') return "567";

      return "1"; // Fallback
    };

    const serviceNum = getServiceNumber();
    const dateObj = new Date(selectedService.date);

    // Format Date: "22nd JANUARY 2026"
    const dayOfMonth = dateObj.getDate();
    const suffix = ["th", "st", "nd", "rd"][((dayOfMonth % 100) - 20) % 10] || ["th", "st", "nd", "rd"][dayOfMonth % 10] || "th";
    const formattedDate = `${dayOfMonth}${suffix} ${dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()}`;

    // Determine Header: THURSDAY FELLOWSHIP or SUNDAY SERVICE
    const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase(); // THURSDAY
    const headerTitle = dayName === 'THURSDAY' ? 'THURSDAY FELLOWSHIP' : 'SUNDAY SERVICE';
    const mainHeader = dayName === 'THURSDAY' ? '*PHANEROO THURSDAY LIVE STREAM REPORT* 🌏' : '*PHANEROO SUNDAY SERVICE REPORT* 🌏';

    // Fetch Fresh Souls Count
    let freshSoulsWon = 0;
    try {
      freshSoulsWon = await SoulsStore.getServiceStats(selectedService.id);
    } catch (e) {
      console.error("Failed to fetch fresh souls count", e);
    }

    const attendance = checkInStats.total;
    const firstTimers = checkInStats.firstTimers;
    const soulsWon = freshSoulsWon;
    const nextGen = selectedService.stats.manualChildrenCount || 0;

    const reportText = `${mainHeader}
  
  💥 DATE: ${formattedDate}
  
  💥 REGION : Central.
  
  💥 ${headerTitle}: ${serviceNum}
  
  💥 LIVESTREAM CENTRE: ENTEBBE 👑
  
  💥 TOTAL ATTENDANCE: ${attendance}
  
  💥 FIRST TIMERS: ${firstTimers}
  
  💥 NUMBER OF SOULS WON: ${soulsWon}
  
  💥 TESTIMONIES:NONE
  
  👥NEXT GEN: ${nextGen}
      `.trim();



    try {
      await navigator.clipboard.writeText(reportText);
      showToast("Report copied to clipboard! 📋", 'success');
    } catch (err) {
      console.error("Failed to copy", err);
      showToast("Failed to copy to clipboard", 'error');
    }
  };

  /* --- EXPORT MEMBERS --- */
  const handleExportMembers = async () => {
    try {
      // Export is now safely bounded to the currently searched dataset up to 100 rows to prevent Node.js OOM crashes.
      const result = await MemberStore.getMembers(1, 100, debouncedSearchQuery);
      if (result.status === 'error') {
        showToast(`Export failed: ${result.message}`, 'error');
        return;
      }

      const allMembers = result.data;

      if (!allMembers || allMembers.length === 0) {
        showToast("No members to export.", 'error');
        return;
      }

      // Format data for Excel
      const exportData = allMembers.map(m => ({
        'Full Name': m.name,
        'Phone Number': m.phone,
        'Category': m.category,
        'Gender': m.gender,
        'Residency': m.residency,
        'Born Again': m.bornAgain,
        'Ministry Member': m.status, // or logic for isPhanerooMember if mapped distinct from status
        'Joined Date': m.joinedDate,
        'Status': m.status
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Members Database");

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Members_Database_${dateStr}.xlsx`);

      showToast(`Successfully exported ${allMembers.length} members!`, 'success');
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to export members.", 'error');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 relative pb-20 md:pb-8">
      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200">
            <div className="flex items-center space-x-3 mb-6 text-red-600">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-xl font-bold">{eventToDelete ? 'Delete Event/Service?' : 'Delete Members?'}</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {eventToDelete ? (
                <>
                  You are about to PERMANENTLY delete <span className="font-bold text-gray-900">{eventToDelete.title}</span>.
                  <br /><br />
                  This includes all pickup stations, vehicles, and passenger manifests.
                </>
              ) : (
                <>
                  You are about to delete <span className="font-bold text-gray-900">{selectedMemberIds.size}</span> members from the database.
                  This action cannot be undone.
                </>
              )}
            </p>
            <div className="space-y-2 mb-6">
              <label className="text-sm font-bold text-gray-700">Enter Admin/Head Password to Confirm</label>
              <input
                type="password"
                autoComplete="new-password"
                autoFocus
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="Password"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); setEventToDelete(null); }}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Count Modal */}
      <ManualCountModal
        isOpen={isChildCountModalOpen}
        onClose={() => setIsChildCountModalOpen(false)}
        onConfirm={handleUpdateManualCount}
        initialCount={selectedService?.stats?.manualChildrenCount || 0}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-ministry-orange" />
            {isLogisticsRole ? 'Logistics Entry' : 'Registration Dashboard'}
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            {isLogisticsRole ? 'Manage vehicles and passengers for your station.' : 'Manage event registration, stations, and member database.'}
          </p>
        </div>
      </div>

      {/* [PHASE B] Tab bar removed — RegistrationLayout renders NavLink tabs */}
      {/* Internal header still shown for Logistics (who see a different title) */}

      <div className={`${isLogisticsRole ? '' : 'bg-ministry-card border border-gray-200'} rounded-2xl md:p-6 shadow-sm min-h-[500px]`}>

        {/* ... (Checkin Tab Code) ... */}
        {!isLogisticsRole && effectiveTab === 'checkin' && viewMode === 'list' && (
          <div className="space-y-6 p-4 md:p-0">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Active Services</h3>
              {!isLogisticsRole && canCreateService && (
                <button
                  onClick={() => { setEventFormType('Service'); setIsAddEventOpen(true); }}
                  className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors shadow-sm font-bold text-sm"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span className="hidden md:inline">Add Service</span>
                  <span className="md:hidden">Add</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => {
                const isClosed = isServiceClosed(service.date);
                return (
                  <div key={service.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/40 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                        {isClosed ? 'Past' : 'Active'}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-ministry-text">{service.title}</h4>
                    <p className="text-sm text-gray-500 mb-4">{service.date} • {service.time}</p>
                    <button
                      onClick={() => handleOpenService(service)}
                      className={`w-full py-2 rounded-lg font-bold transition-colors ${isClosed ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-ministry-text text-white hover:bg-ministry-orange'}`}
                    >
                      {isClosed ? 'View Highlights' : 'Open Check-In'}
                    </button>
                    {currentUser.role === 'TeamLeader' && (
                      <button
                        onClick={() => handleDeleteEvent(service)}
                        className="mt-2 w-full py-2 rounded-lg font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center border border-red-100"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Service
                      </button>
                    )}
                  </div>
                )
              })}
              {services.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                  No active services scheduled.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ... (Active Service View Code) ... */}
        {viewMode === 'service-active' && selectedService && (
          <div className="space-y-6 p-4 md:p-0">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-3">
                <button onClick={handleBackRegistration} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-ministry-text">{selectedService.title}</h2>
                    {isServiceClosed(selectedService.date) && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full border border-gray-200 font-bold">LOCKED</span>}
                  </div>
                  <p className="text-sm text-gray-500">{isServiceClosed(selectedService.date) ? 'Service Highlights' : 'Live Check-In'} • {selectedService.date}</p>
                </div>
              </div>
              {!isServiceClosed(selectedService.date) && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsChildCountModalOpen(true)}
                    className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 border border-gray-200 shadow-sm"
                  >
                    <Baby className="w-4 h-4" />
                    <span className="hidden md:inline">Children Count</span>
                  </button>
                  {/* Copy Report Permission: Explicit Roles Only */}
                  {['Administrator', 'Head of Dept', 'Department Head', 'Dept Admin', 'Reg. Admin', 'Registration Admin', 'Registration Head'].includes(currentUser.role) && (
                    <button
                      onClick={handleCopyReport}
                      className="flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-200 shadow-sm transition-colors"
                      title="Copy WhatsApp Report"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setViewMode('register-new')} className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 shadow-md">
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden md:inline">Register New</span>
                  </button>
                </div>
              )}

            </div>

            {/* Check-in Stats Cards */}
            {
              isServiceClosed(selectedService.date) ? (
                /* --- CLOSED / HIGHLIGHTS VIEW --- */
                <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Members */}
                    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Members</p>
                      <p className="text-4xl font-black text-gray-900 mt-2">{checkInStats.total}</p>
                    </div>

                    {/* First Timers */}
                    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="p-3 bg-orange-50 text-orange-600 rounded-full mb-3">
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">First Timers</p>
                      <p className="text-4xl font-black text-gray-900 mt-2">{checkInStats.firstTimers}</p>
                    </div>

                    {/* Children Count */}
                    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-3">
                        <Baby className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Children Count</p>
                      <p className="text-4xl font-black text-gray-900 mt-2">{selectedService.stats?.manualChildrenCount || 0}</p>
                    </div>

                    {/* Souls Won */}
                    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3">
                        <Heart className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Souls Won</p>
                      <p className="text-4xl font-black text-gray-900 mt-2">{checkInStats.soulsWon}</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleDownloadHighlights}
                      className="flex items-center space-x-3 bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download Highlights Report</span>
                    </button>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 max-w-2xl mx-auto">
                    <p className="flex items-center justify-center gap-2 font-medium">
                      <Lock className="w-4 h-4" /> Service is Closed
                    </p>
                    <p className="text-sm mt-1">Detailed check-in lists and editing are disabled for past services.</p>
                  </div>
                </div>
              ) : (
                /* --- ACTIVE CHECK-IN VIEW --- */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setFilterCategory(prev => prev === 'CHECKED_IN_ALL' ? null : 'CHECKED_IN_ALL')}
                      className={`cursor-pointer p-4 rounded-xl shadow-lg border-l-4 border-ministry-neon transition-all ${filterCategory === 'CHECKED_IN_ALL' ? 'bg-ministry-neon/10 ring-2 ring-ministry-neon transform scale-[1.02]' : (!filterCategory ? 'bg-ministry-text text-white transform scale-[1.02]' : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50')}`}
                    >
                      <p className={`text-xs uppercase font-bold ${filterCategory === 'CHECKED_IN_ALL' ? 'text-ministry-text' : (!filterCategory ? 'text-gray-400' : 'text-gray-500')}`}>Total Check-ins</p>
                      <p className={`text-3xl font-black mt-1 ${filterCategory === 'CHECKED_IN_ALL' ? 'text-ministry-text' : ''}`}>{checkInStats.total}</p>
                    </div>
                    <div
                      onClick={() => setFilterCategory(prev => prev === 'First Timer' ? null : 'First Timer')}
                      className={`cursor-pointer p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 border-ministry-orange transition-all ${filterCategory === 'First Timer' ? 'bg-orange-50 ring-2 ring-ministry-orange transform scale-[1.02]' : 'bg-white hover:bg-gray-50'}`}
                    >
                      <p className={`text-xs uppercase font-bold ${filterCategory === 'First Timer' ? 'text-ministry-orange' : 'text-gray-500'}`}>First Timers</p>
                      <p className="text-3xl font-black text-gray-900 mt-1">{checkInStats.firstTimers}</p>
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto space-y-4">
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ministry-orange" />
                      <input className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all" placeholder="Search member by name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>

                    {/* Search Results */}
                    {(searchQuery || filterCategory) && (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
                        {filteredMembers.map(m => (
                          <div key={m.id} className="p-4 flex flex-row justify-between items-center gap-4 hover:bg-gray-50">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 truncate">{m.name}</p>
                              <p className="text-xs text-gray-500 truncate">{m.phone} • {m.residency || 'No Residence'}</p>
                            </div>
                            <div>
                              {checkedInIds.has(m.id) ? (
                                ['Administrator', 'Head of Dept', 'Department Head', 'Dept Admin', 'Reg. Admin', 'Registration Admin', 'Registration Head'].includes(currentUser.role) ? (
                                  <button
                                    onClick={() => handleUndoCheckInMember(m.id)}
                                    className="text-green-600 font-bold text-sm flex items-center hover:text-red-500 transition-colors group"
                                    title="Click to Undo Check-In"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1 group-hover:hidden" /> 
                                    <span className="group-hover:hidden">Checked In</span>
                                    <span className="hidden group-hover:inline text-red-500">Undo Check-In</span>
                                  </button>
                                ) : (
                                  <span className="text-green-600 font-bold text-sm flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Checked In</span>
                                )
                              ) : (
                                <button
                                  onClick={() => handleCheckInMember(m.id)}
                                  className="bg-ministry-text text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors"
                                >
                                  Check In
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {filteredMembers.length === 0 && (
                          <div className="p-4 text-center text-gray-500">No members found.</div>
                        )}
                      </div>
                    )}

                    {/* Manual Add if not found */}
                    {searchQuery && filteredMembers.length === 0 && (
                      <div className="text-center pt-4">
                        <p className="text-gray-500 mb-2">Member not found?</p>
                        <button onClick={() => setViewMode('register-new')} className="text-ministry-orange font-bold hover:underline">
                          Register New Member
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
          </div>
        )}

        {/* ... (Register New Form Code) ... */}
        {!isLogisticsRole && viewMode === 'register-new' && (
          <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
            <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
              <button onClick={handleBackRegistration} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
              <h2 className="text-xl font-bold text-ministry-text">
                {selectedService ? 'Register & Check In' : 'Add New Member'}
              </h2>
            </div>

            <form onSubmit={handleRegister} className="space-y-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
              {/* ... (Existing Form Content) ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 pb-2 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-ministry-orange" /> Personal Details
                  </h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Full Name <span className="text-red-500">*</span></label>
                  <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Gender <span className="text-red-500">*</span></label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="md:col-span-2 pb-2 border-b border-gray-100 mt-2">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    Contact Info
                  </h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Phone Number</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    placeholder="700 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Email Address</label>
                  <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="john@example.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Place of Residence <span className="text-red-500">*</span></label>
                  <input required name="residence" value={formData.residence} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="e.g. Entebbe, Kitoro" />
                </div>

                <div className="md:col-span-2 pb-2 border-b border-gray-100 mt-2">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-ministry-orange" /> Professional
                  </h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Occupation</label>
                  <input name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="e.g. Engineer" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Place of Work</label>
                  <input name="placeOfWork" value={formData.placeOfWork} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="e.g. Ministry Works" />
                </div>

                <div className="md:col-span-2 pb-2 border-b border-gray-100 mt-2">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <Ticket className="w-5 h-5 mr-2 text-ministry-orange" /> Ministry Details
                  </h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Are you a Phaneroo member? <span className="text-red-500">*</span></label>
                  <select name="isPhanerooMember" value={formData.isPhanerooMember} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Born Again?</label>
                  <select name="bornAgain" value={formData.bornAgain} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"><option value="No">No</option><option value="Yes">Yes</option></select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"><option value="First Timer">First Timer</option><option value="Member">Member</option></select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Referral Source</label>
                  <input name="referralSource" value={formData.referralSource} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="Invited by..." />
                </div>
              </div>
              <div className="flex justify-end pt-6 border-t border-gray-100">
                <button type="submit" className="px-10 py-4 bg-ministry-text text-white rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg flex items-center justify-center text-lg">
                  <Save className="w-5 h-5 mr-2" />
                  {selectedService ? 'Register & Check In' : 'Save to Database'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ... (Bulk Import View) ... */}
        {viewMode === 'bulk-import-members' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in p-4 md:p-0">
            <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
              <button onClick={handleBackRegistration} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
              <h2 className="text-xl font-bold text-ministry-text">Bulk Member Import</h2>
            </div>

            <form onSubmit={handleBulkMemberImport} className="space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                <p className="text-sm font-bold text-blue-800">Instructions</p>
                <p className="text-xs text-blue-700 mt-1">
                  Upload an Excel file (.xlsx) or copy and paste cells.
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Columns Order: <span className="font-mono bg-blue-100 px-1 rounded font-bold">Name | Residence | Contact | Gender</span>
                </p>
                <p className="text-xs text-blue-600 mt-1 italic">
                  * All imports will be categorized as "Member".
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
                <label className="text-sm font-bold text-gray-700">Or Paste Excel Data Here</label>
                <textarea
                  required
                  value={bulkMemberText}
                  onChange={e => setBulkMemberText(e.target.value)}
                  className="w-full p-4 h-64 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none font-mono text-sm whitespace-pre"
                  placeholder={`John Doe\tEntebbe\t0772123456\tMale\nJane Smith\tKampala\t0700987654\tFemale`}
                />
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="flex items-center space-x-2 bg-ministry-text text-white px-6 py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                  <Upload className="w-4 h-4" />
                  <span>Import Members</span>
                </button>
              </div>
            </form>

            {/* Loading Overlay */}
            {isImporting && (
              <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-ministry-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <h3 className="text-xl font-bold text-gray-800">Importing Members...</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-ministry-orange h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                  </div>
                  <p className="text-gray-500 font-mono">{importProgress}% Complete</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === EVENTS & LOGISTICS TAB (UPDATED HIERARCHY) === */}
        {effectiveTab === 'events' && (
          <div className="space-y-6">
            {isLogisticsInitializing ? (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                <div className="w-12 h-12 border-4 border-ministry-orange border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-bold">Synchronizing Station...</p>
              </div>
            ) : (
              <>
                {/* LEVEL 1: EVENTS LIST */}
                {!selectedLogisticsEvent && !selectedStation && viewMode !== 'station-detail' && (
                  <div className="animate-in fade-in p-4 md:p-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Select an Event to Manage Stations</h3>
                      {!isLogisticsRole && (
                        <button
                          onClick={() => { setEventFormType('Event'); setIsAddEventOpen(true); }}
                          className="flex items-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-bold text-sm"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          <span>Plan Event</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {logisticsEvents.map(event => (
                        <div key={event.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all group">
                          <div className="flex justify-between items-start mb-3">
                            <Calendar className="w-6 h-6 text-gray-400 group-hover:text-ministry-orange transition-colors" />
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-50 text-purple-600">
                              {event.type}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h4>
                          <p className="text-sm text-gray-500 mb-4">{event.date} • {event.time}</p>
                          <button
                            onClick={() => {
                              if (isEventLocked(event.date)) {
                                setHighlightEvent(event);
                                setShowHighlights(true);
                              } else {
                                setSelectedLogisticsEvent(event);
                              }
                            }}
                            className={`w-full py-2 rounded-lg font-bold transition-colors ${isEventLocked(event.date)
                              ? 'bg-gray-900 text-white hover:bg-black'
                              : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-ministry-text hover:text-white'
                              }`}
                          >
                            {isEventLocked(event.date) ? 'Preview Highlights' : 'View Stations'}
                          </button>

                          {currentUser.role === 'TeamLeader' && (
                            <button
                              onClick={() => handleDeleteEvent(event)}
                              className="mt-2 w-full py-2 rounded-lg font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center border border-red-100"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                            </button>
                          )}
                        </div>
                      ))}
                      {logisticsEvents.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                          No special events found. Logistics for services are handled via Service Check-In if configured.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LEVEL 2: STATION LIST (FOR SELECTED EVENT) */}
                {selectedLogisticsEvent && !selectedStation && (
                  <div className="animate-in slide-in-from-right-4 p-4 md:p-0">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center space-x-3">
                        <button onClick={handleBackLogistics} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{selectedLogisticsEvent.title}</h3>
                          <p className="text-sm text-gray-500">Pickup Stations Management</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAddStationOpen(true)}
                        className="flex items-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Pickup Station</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {stations.filter(s => s.eventId === selectedLogisticsEvent.id).map(station => (
                        <div key={station.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-blue-50 rounded-lg"><MapPin className="w-5 h-5 text-blue-600" /></div>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded font-bold text-gray-600">
                              {vehicles.filter(v => v.stationId === station.id).length} Vehicles
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900">{station.name}</h4>
                          <p className="text-sm text-gray-500 mb-4">{station.location}</p>
                          <div className="flex items-center text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                            <UserPlus className="w-3 h-3 mr-2" />
                            Coord: {station.coordinatorName || 'None'}
                          </div>
                          <button
                            onClick={() => handleSelectStation(station)}
                            className="w-full bg-white border border-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                          >
                            View Station Details
                          </button>
                        </div>
                      ))}
                      {stations.filter(s => s.eventId === selectedLogisticsEvent.id).length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                          No pickup stations added for this event yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LEVEL 3: STATION DETAILS (VEHICLES & ENTRANTS) */}
                {selectedStation && !selectedVehicle && (
                  <div className="animate-in slide-in-from-right-4 space-y-6">

                    {/* Mobile-Optimized Station Header Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mx-4 md:mx-0">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {!isLogisticsRole && (
                                <button onClick={handleBackLogistics} className="p-1 -ml-2 hover:bg-gray-100 rounded-full text-gray-500">
                                  <ArrowLeft className="w-5 h-5" />
                                </button>
                              )}
                              <span className="text-xs font-bold uppercase tracking-wider text-ministry-orange">
                                {selectedLogisticsEvent?.title || 'Event'}
                              </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                              {selectedStation.name}
                            </h2>
                            <p className="text-gray-500 flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {selectedStation.location}
                            </p>
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center justify-between md:flex-col md:items-end gap-4 mt-2 md:mt-0">
                            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-2 rounded-xl flex flex-col items-center">
                              <span className="text-xs font-bold uppercase">Registered</span>
                              <span className="text-2xl font-bold leading-none">
                                {passengers.filter(p => vehicles.find(v => v.id === p.vehicleId)?.stationId === selectedStation.id).length}
                              </span>
                            </div>

                            {isLogisticsRole && (
                              <button
                                onClick={() => {
                                  setVehicleForm({
                                    number_plate: '',
                                    driverName: '',
                                    driverContact: '256',
                                    driverNin: '',
                                    type: 'Taxi',
                                    capacity: '',
                                    coordinator: '',
                                    id: ''
                                  });
                                  setIsAddVehicleOpen(true);
                                }}
                                className="flex items-center justify-center space-x-2 bg-ministry-orange text-white px-6 py-3 rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-200 transition-transform active:scale-95 font-bold"
                              >
                                <Plus className="w-5 h-5" />
                                <span>Add Vehicle</span>
                              </button>
                            )}

                            {canDeleteLogistics && (
                              <div className="flex space-x-2 mt-2 md:mt-0">
                                <button
                                  onClick={() => {
                                    setStationForm({
                                      id: selectedStation.id,
                                      name: selectedStation.name,
                                      location: selectedStation.location,
                                      coordinatorName: selectedStation.coordinatorName || '',
                                      coordinatorContact: selectedStation.coordinatorContact || '',
                                      // Pre-fill first entrant if available
                                      entrantName: stationEntrants[0] ? stationEntrants[0].name : '',
                                      entrantUsername: stationEntrants[0] ? stationEntrants[0].username || '' : '',
                                      entrantPassword: stationEntrants[0] ? stationEntrants[0].password || '' : ''
                                    });
                                    setIsAddStationOpen(true);
                                  }}
                                  className="bg-gray-100 text-gray-700 p-3 rounded-xl hover:bg-gray-200 transition-colors"
                                  title="Edit Station"
                                >
                                  <Settings className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={handleDeleteStation}
                                  className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                                  title="Delete Station"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Decorative element */}
                      <div className="h-1 w-full bg-gray-100">
                        <div className="h-full bg-ministry-orange w-1/3 rounded-r-full"></div>
                      </div>
                    </div>

                    {/* ENTRANT MANAGEMENT (ADMIN ONLY) */}
                    {!isLogisticsRole && (
                      <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-200 mx-4 md:mx-0">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-ministry-orange" />
                            Assigned Data Entrants
                          </h3>
                          <button
                            onClick={() => setIsAddEntrantOpen(true)}
                            className="text-sm font-bold text-ministry-text hover:text-ministry-orange flex items-center bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add Entrant
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {stationEntrants.map(user => (
                            <div key={user.id} className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-ministry-neon text-black font-bold rounded-full flex items-center justify-center">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-gray-900">{user.name}</p>
                                  <p className="text-xs text-gray-500">@{user.username}</p>
                                </div>
                              </div>
                              <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-bold">Active</div>
                            </div>
                          ))}
                          {stationEntrants.length === 0 && (
                            <div className="col-span-full py-4 text-center text-gray-400 text-sm italic">
                              No Data Entrants assigned.
                            </div>
                          )}
                        </div>
                        {/* Add Entrant Button */}
                        <button
                          onClick={() => setIsAddEntrantOpen(true)}
                          className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-ministry-orange hover:text-ministry-orange transition-colors flex items-center justify-center text-sm"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add Data Entrant
                        </button>
                      </div>
                    )}

                    {/* VEHICLE LIST */}
                    <div className="px-4 md:px-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Bus className="w-5 h-5 mr-2 text-ministry-orange" /> Registered Vehicles</h3>
                      {/* DEBUG: Vehicle List */}
                      {console.log("Rendering Vehicles:", {
                        totalVehicles: vehicles.length,
                        selectedStationId: selectedStation?.id,
                        filteredCount: vehicles.filter(v => v.stationId === selectedStation?.id).length,
                        sampleVehicle: vehicles[0]
                      })}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {vehicles.filter(v => String(v.stationId) === String(selectedStation.id)).map(vehicle => {
                          const vPassengers = passengers.filter(p => p.vehicleId === vehicle.id);
                          let statusColor = "bg-gray-100 text-gray-600";
                          let statusText = vehicle.currentStage || "Onboarding";

                          if (vehicle.currentStage === 'RegApproval') { statusColor = "bg-orange-100 text-orange-700"; }
                          else if (vehicle.currentStage === 'FinanceApproval') { statusColor = "bg-blue-100 text-blue-700"; }
                          else if (vehicle.currentStage === 'Transit') { statusColor = "bg-green-100 text-green-700"; }

                          return (
                            <div key={vehicle.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-ministry-orange/50 transition-all group">
                              <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-start">
                                <span className="font-mono font-bold text-xl text-gray-900">{vehicle.number_plate}</span>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold uppercase bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-500 block mb-1">{vehicle.type}</span>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor}`}>
                                    {statusText}
                                  </span>
                                </div>
                              </div>
                              <div className="p-4">
                                <div className="mb-4 flex justify-between">
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Driver</p>
                                    <p className="font-bold text-gray-700">{vehicle.driverName}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Passengers</p>
                                    <div className="flex items-center justify-end text-blue-600 font-bold text-lg">
                                      <Users className="w-4 h-4 mr-1" />
                                      {vPassengers.length}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedVehicle(vehicle)}
                                  className="w-full text-center bg-ministry-text text-white py-3 rounded-xl font-bold text-sm hover:bg-ministry-orange transition-colors flex items-center justify-center shadow-md active:scale-95"
                                >
                                  Manage Vehicle <ChevronRight className="w-4 h-4 ml-1" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {vehicles.filter(v => String(v.stationId) === String(selectedStation.id)).length === 0 && (
                          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                            No vehicles registered at this station yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* LEVEL 4: VEHICLE DETAILS (DETAILS) */}
                {selectedVehicle && (() => {
                  const isLocked = selectedVehicle.approvals?.registration === 'Approved';
                  return (
                    <div className="animate-in slide-in-from-right-4 p-4 md:p-0">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                        <div className="flex items-center space-x-3">
                          <button onClick={handleBackLogistics} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                          </button>
                          <div>
                            <h2 className="text-2xl font-bold font-mono text-ministry-text flex items-center flex-wrap gap-2">
                              {selectedVehicle.number_plate}
                              <span className={`text-xs px-2 py-1 rounded-full font-bold ${selectedVehicle.currentStage === 'FinanceApproval' ? 'bg-blue-100 text-blue-700' :
                                selectedVehicle.currentStage === 'RegApproval' ? 'bg-orange-100 text-orange-700' :
                                  selectedVehicle.currentStage === 'Transit' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {selectedVehicle.currentStage || 'Onboarding'}
                              </span>
                            </h2>
                            <p className="text-sm text-gray-500">Vehicle Details & Statistics</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center justify-start lg:justify-end">
                          {(() => {

                            // Allow approval for Administrator, TeamLeader, and Lead
                            const canApprove = ['Administrator', 'TeamLeader', 'Head of Dept'].includes(currentUser.role);

                            // Show button if authorized (either active or disabled state)
                            const isApproved = selectedVehicle.currentStage === 'FinanceApproval' || isLocked;

                            return (
                              <>
                                {isLogisticsRole ? (
                                  <button
                                    onClick={() => {
                                      setChildrenForm({ count: String(selectedVehicle.childrenCount || 0) });
                                      setIsAddChildrenOpen(true);
                                    }}
                                    disabled={isLocked}
                                    className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm font-bold ${isLocked
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-gray-800 text-white hover:bg-gray-900'
                                      }`}
                                  >
                                    <Baby className="w-4 h-4" />
                                    <span>Children Count</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={handlePrintManifest}
                                    className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors shadow-sm font-bold"
                                  >
                                    <Printer className="w-4 h-4" />
                                    <span>Print Vehicle</span>
                                  </button>
                                )}

                                {/* APPROVE BUTTON */}
                                {canApprove && (
                                  <button
                                    onClick={handleApproveVehicle}
                                    disabled={isApproved}
                                    className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm font-bold ${isApproved
                                      ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-200'
                                      : 'bg-green-600 text-white hover:bg-green-700'
                                      }`}
                                  >
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>{isApproved ? 'Approved (Finance)' : 'Approve Vehicle'}</span>
                                  </button>
                                )}

                                {/* Add Buttons: Only if not locked */}
                                {!isLocked ? (
                                  <>
                                    <button
                                      onClick={openAddMember}
                                      className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                                    >
                                      <UserPlus className="w-4 h-4" />
                                      <span>Add Member</span>
                                    </button>
                                    <button
                                      onClick={openAddStudent}
                                      className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-white border border-ministry-text text-ministry-text px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-bold"
                                    >
                                      <GraduationCap className="w-4 h-4" />
                                      <span>Add Student</span>
                                    </button>
                                    <button
                                      onClick={openAddInstitution}
                                      className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-white border border-ministry-text text-ministry-text px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-bold"
                                    >
                                      <Building2 className="w-4 h-4" />
                                      <span>Add Institution</span>
                                    </button>
                                  </>
                                ) : (
                                  // Locked State Indicator
                                  <div className="flex items-center space-x-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg font-bold border border-gray-200 cursor-not-allowed">
                                    <Lock className="w-4 h-4" />
                                    <span>Vehicle Locked ({selectedVehicle.currentStage})</span>
                                  </div>
                                )}

                                {/* LOGISTICS ACTIONS (Edit/Delete) - Moved to end for better layout flow */}
                                {canDeleteLogistics && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        setVehicleForm({
                                          number_plate: selectedVehicle.number_plate,
                                          driverName: selectedVehicle.driverName,
                                          driverContact: selectedVehicle.driverContact,
                                          driverNin: selectedVehicle.driverNin || '',
                                          type: selectedVehicle.type,
                                          capacity: '',
                                          coordinator: selectedVehicle.coordinator || '',
                                          id: selectedVehicle.id // Set ID for edit mode
                                        });
                                        setIsAddVehicleOpen(true);
                                      }}
                                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                      title="Edit Vehicle"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={handleDeleteVehicle}
                                      className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-100"
                                      title="Delete Vehicle"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Total Passengers</p>
                          <p className="text-2xl font-bold text-ministry-text mt-1">{passengers.filter(p => p.vehicleId === selectedVehicle.id).length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">First Timers</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">{passengers.filter(p => p.vehicleId === selectedVehicle.id && p.isFirstTime === 'Yes').length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Students</p>
                          <p className="text-2xl font-bold text-blue-600 mt-1">{passengers.filter(p => p.vehicleId === selectedVehicle.id && p.category === 'Student').length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Institutions</p>
                          <p className="text-2xl font-bold text-purple-600 mt-1">{passengers.filter(p => p.vehicleId === selectedVehicle.id && p.category === 'Institution').length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-ministry-orange">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Children</p>
                          <p className="text-2xl font-bold text-ministry-orange mt-1">{selectedVehicle.childrenCount || 0}</p>
                        </div>
                      </div>

                      {/* Manifest Table */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-white flex items-center">
                          <LayoutList className="w-4 h-4 mr-2 text-gray-500" />
                          <h4 className="font-bold text-gray-700 text-sm uppercase">Passenger Manifest</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Residence</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {passengers.filter(p => p.vehicleId === selectedVehicle.id).map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                  <td className="px-6 py-4 text-sm">{p.category}</td>
                                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{p.contact}</td>
                                  <td className="px-6 py-4 text-sm text-gray-600">{p.residence}</td>
                                  <td className="px-6 py-4">
                                    {p.isFirstTime === 'Yes' ? (
                                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">New</span>
                                    ) : (
                                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">Member</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPassengerForm({
                                          ...p,
                                          id: p.id // Ensure ID is set for edit mode
                                        });
                                        setIsAddPassengerOpen(true);
                                      }}
                                      disabled={isLocked}
                                      className={`p-2 rounded-lg transition-colors mr-1 ${isLocked ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                      title={isLocked ? "Cannot edit locked vehicle" : "Edit Passenger"}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent any parent clicks
                                        handleDeletePassenger(p.id);
                                      }}
                                      disabled={isLocked}
                                      className={`p-2 rounded-lg transition-colors ${isLocked ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                      title={isLocked ? "Cannot remove from locked vehicle" : "Remove Passenger"}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {passengers.filter(p => p.vehicleId === selectedVehicle.id).length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No passengers recorded in this vehicle.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
        {/* ... Database Tabs ... */}
        {activeTab === 'database' && viewMode === 'list' && (
          <div className="space-y-6 p-4 md:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-gray-800">Member Database</h3>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => { setSelectedService(null); setViewMode('register-new'); }}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
                <button
                  onClick={() => setViewMode('bulk-import-members')}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Bulk Import</span>
                </button>
                <button
                  onClick={handleExportMembers}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isSearching ? 'text-ministry-orange animate-pulse' : 'text-gray-400'}`} />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-ministry-orange animate-spin" />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Search database..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to page 1 on search
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministry-orange transition-all"
                />
              </div>
              {selectedMemberIds.size > 0 && (
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                  <span className="text-xs font-bold text-gray-600">{selectedMemberIds.size} Selected</span>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* LEVEL 1: DATABASE LIST */}
            <div className="animate-in fade-in space-y-4">
              {/* PAGINATION CONTROLS */}
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-10">
                <div>
                  <span className="text-sm text-gray-600">Showing </span>
                  <span className="font-bold text-gray-900">
                    {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalMembers)}
                  </span>
                  <span className="text-sm text-gray-600"> of {totalMembers} members</span>
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
                    disabled={currentPage * itemsPerPage >= totalMembers}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[70vh]">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left relative">
                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className="p-4 w-10"><input type="checkbox" onChange={handleSelectAll} checked={selectedMemberIds.size === filteredMembers.length && filteredMembers.length > 0} className="rounded border-gray-300" /></th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Phone</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="p-4"><input type="checkbox" checked={selectedMemberIds.has(member.id)} onChange={() => handleSelectOne(member.id)} className="rounded border-gray-300" /></td>
                          <td className="p-4 font-bold text-gray-900">{member.name}</td>
                          <td className="p-4 text-sm text-gray-600">{member.category}</td>
                          <td className="p-4 text-sm font-mono text-gray-600">{member.phone}</td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${member.status === 'Checked In' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleViewMember(member.id)} className="text-ministry-blue font-bold text-xs hover:underline bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredMembers.length === 0 && (
                        <tr><td colSpan={6} className="p-12 text-center text-gray-400">No members found matching your search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Bottom Pagination Info */}
                <div className="flex justify-center mt-4">
                  <div className="text-xs text-gray-500">
                    Page {currentPage} of {Math.ceil(totalMembers / itemsPerPage)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MEMBER DETAIL VIEW --- */}
        {viewMode === 'member-detail' && selectedMemberDetails && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setViewMode('list')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-800">
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
                  <p className="text-2xl font-black text-gray-900">{selectedMemberDetails.attendedCount} Services</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-full"><CalendarCheck className="w-8 h-8 text-purple-600" /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400">Expected Services</p>
                  <p className="text-2xl font-black text-gray-900">{selectedMemberDetails.totalServices} Held</p>
                  <p className="text-xs text-gray-500">Since Joined ({new Date(selectedMemberDetails.member.joinedDate || '').toLocaleDateString()})</p>
                </div>
              </div>
              <div className="bg-ministry-text text-white p-6 rounded-2xl shadow-lg border-l-4 border-ministry-neon flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-full"><BarChart3 className="w-8 h-8 text-white" /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400">Attendance Score</p>
                  <p className="text-3xl font-black">
                    {selectedMemberDetails.totalServices > 0
                      ? Math.round((selectedMemberDetails.attendedCount / selectedMemberDetails.totalServices) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* LEFT: Profile Details */}
              <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><UserIcon className="w-5 h-5" /> Member Profile</h3>
                  <button
                    onClick={() => setIsEditingMember(!isEditingMember)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isEditingMember ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
                  >
                    {isEditingMember ? 'Cancel Editing' : 'Edit Details'}
                  </button>
                </div>

                <form onSubmit={handleUpdateMember} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Full Name</label>
                      <input disabled={!isEditingMember} value={formData.name} onChange={handleInputChange} name="name" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Phone</label>
                      <PhoneInput
                        disabled={!isEditingMember}
                        value={formData.phone}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                        className={`w-full ${!isEditingMember ? 'bg-gray-50' : 'bg-white'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Category</label>
                      <select disabled={!isEditingMember} value={formData.category} onChange={handleInputChange as any} name="category" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`}>
                        <option>First Timer</option>
                        <option>Member</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Residence</label>
                      <input disabled={!isEditingMember} value={formData.residence} onChange={handleInputChange} name="residence" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Occupation</label>
                      <input disabled={!isEditingMember} value={formData.occupation} onChange={handleInputChange} name="occupation" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Place of Work</label>
                      <input disabled={!isEditingMember} value={formData.placeOfWork} onChange={handleInputChange} name="placeOfWork" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                    </div>
                  </div>

                  {isEditingMember && (
                    <div className="pt-4 flex justify-end">
                      <button type="submit" className="bg-ministry-text text-white px-6 py-2 rounded-xl font-bold hover:bg-ministry-orange transition-colors">Save Changes</button>
                    </div>
                  )}
                </form>
              </div>

              {/* RIGHT: Attendance History */}
              <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><History className="w-5 h-5" /> Recent Activity</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {selectedMemberDetails.history.map((record, idx) => (
                    <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className={`p-2 rounded-full mr-3 ${record.type === 'Service' || !record.type ? 'bg-green-100' : 'bg-purple-100'}`}>
                        {record.type === 'Service' || !record.type ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Calendar className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          {record.title}
                          {record.type && record.type !== 'Service' && (
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                              {record.type}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{record.date} at {record.checkInTime}</p>
                      </div>
                    </div>
                  ))}
                  {selectedMemberDetails.history.length === 0 && (
                    <p className="text-center text-gray-400 py-8 text-sm">No attendance records found yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals (Add Station, Entrant, Vehicle, Passenger) */}

        {isAddStationOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">{stationForm.id ? 'Edit Pickup Station' : 'Add Pickup Station'}</h3>
              <form onSubmit={handleAddStation} className="space-y-4">
                <div className="space-y-4 border-b border-gray-100 pb-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase">Station Details</h4>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Station Name</label>
                    <input required value={stationForm.name} onChange={e => setStationForm({ ...stationForm, name: e.target.value })} className="w-full p-3 border rounded-xl bg-white" placeholder="e.g. Kitoro Stage" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Location Description</label>
                    <input required value={stationForm.location} onChange={e => setStationForm({ ...stationForm, location: e.target.value })} className="w-full p-3 border rounded-xl bg-white" placeholder="Detailed location" />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center"><Key className="w-3 h-3 mr-1" /> Assign Data Entrant</h4>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Entrant Name</label>
                    <input required value={stationForm.entrantName} onChange={e => setStationForm({ ...stationForm, entrantName: e.target.value })} className="w-full p-3 border rounded-xl bg-white" placeholder="Person handling data" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Username</label>
                      <input required autoComplete="off" value={stationForm.entrantUsername} onChange={e => setStationForm({ ...stationForm, entrantUsername: e.target.value })} className="w-full p-3 border rounded-xl bg-white" placeholder="jdoe" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Password</label>
                      <input required autoComplete="new-password" type="password" value={stationForm.entrantPassword} onChange={e => setStationForm({ ...stationForm, entrantPassword: e.target.value })} className="w-full p-3 border rounded-xl bg-white" placeholder="••••••" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4 gap-3">
                  <button type="button" onClick={() => { setIsAddStationOpen(false); setStationForm(initialStationForm); }} className="px-4 py-2 text-gray-600 font-bold">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange">
                    {stationForm.id ? 'Update Station & User' : 'Create Station & User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
        }



      </div >

      {isAddEntrantOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-4">Add Data Entrant</h3>
            <p className="text-xs text-gray-500 mb-4">Adding entrant to <strong>{selectedStation?.name}</strong></p>
            <form onSubmit={handleAddExtraEntrant} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Full Name</label>
                <input
                  required
                  value={newEntrant.name}
                  onChange={e => setNewEntrant({ ...newEntrant, name: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-ministry-orange"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Username</label>
                <input
                  required
                  autoComplete="off"
                  value={newEntrant.username}
                  onChange={e => setNewEntrant({ ...newEntrant, username: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-ministry-orange"
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Password</label>
                <input
                  required
                  autoComplete="new-password"
                  type="password"
                  value={newEntrant.password}
                  onChange={e => setNewEntrant({ ...newEntrant, password: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-ministry-orange"
                  placeholder="••••••"
                />
              </div>
              <div className="flex justify-end pt-4 gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAddEntrantOpen(false); setNewEntrant({ name: '', username: '', password: '' }); }}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange transition-colors"
                >
                  Add Entrant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {
        isAddVehicleOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">{vehicleForm.id ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
              <form onSubmit={handleAddVehicle} className="space-y-4">

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Vehicle Coordinator</label>
                  <select
                    required
                    value={vehicleForm.coordinator}
                    onChange={e => setVehicleForm({ ...vehicleForm, coordinator: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-ministry-blue"
                  >
                    <option value="">Select Coordinator</option>
                    {coordinators
                      .filter(coord =>
                        coord.eventId === selectedStation?.eventId &&
                        (coord.stationId === selectedStation?.id || !coord.stationId)
                      )
                      .map(coord => (
                        <option key={coord.id} value={coord.name}>
                          {coord.name} ({coord.username})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Driver Name</label>
                    <input
                      required
                      value={vehicleForm.driverName}
                      onChange={e => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-ministry-blue"
                      placeholder="Full Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-700">Driver NIN / Permit No.</label>
                      {vehicleForm.driverNin && (
                        <div className={`w-3 h-3 rounded-full ${validateDriverIdentity(vehicleForm.driverNin).valid ? 'bg-green-500' : 'bg-red-500'}`} title={validateDriverIdentity(vehicleForm.driverNin).error || "Valid ID"} />
                      )}
                    </div>
                    <input
                      required
                      value={vehicleForm.driverNin}
                      onChange={e => {
                        let val = e.target.value.toUpperCase();
                        // Enforce NIN limit (14 chars) if it looks like a NIN (Starts with C)
                        if (val.startsWith('C') && val.length > 14) {
                          return; // Ignore input if it exceeds 14 chars for NINs
                        }
                        setVehicleForm({ ...vehicleForm, driverNin: val })
                      }}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-ministry-blue uppercase"
                      placeholder="NIN or Permit Number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Driver Contact</label>
                  <PhoneInput required value={vehicleForm.driverContact} onChange={(val) => setVehicleForm({ ...vehicleForm, driverContact: val })} placeholder="700 000 000" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Number Plate</label>
                  <NumberPlateInput
                    required
                    value={vehicleForm.number_plate}
                    onChange={(val) => setVehicleForm({ ...vehicleForm, number_plate: val })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Vehicle Type</label>
                  <select value={vehicleForm.type} onChange={e => setVehicleForm({ ...vehicleForm, type: e.target.value as any })} className="w-full p-3 border rounded-xl bg-white">
                    {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex justify-end pt-4 gap-3">
                  <button type="button" onClick={() => setIsAddVehicleOpen(false)} className="px-4 py-2 text-gray-600 font-bold">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange">
                    {vehicleForm.id ? 'Update Vehicle' : 'Register Vehicle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {
        isAddPassengerOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">
                {passengerForm.category === 'Student' ? 'Add Student' : 'Add Member'} to Vehicle
              </h3>
              <p className="text-sm text-gray-500 mb-4">Adding to {selectedVehicle?.number_plate}</p>
              <form onSubmit={handleAddPassenger} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Full Name</label>
                    <input required value={passengerForm.name} onChange={e => setPassengerForm({ ...passengerForm, name: e.target.value })} className="w-full p-3 border rounded-xl bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Gender</label>
                    <select value={passengerForm.gender} onChange={e => setPassengerForm({ ...passengerForm, gender: e.target.value })} className="w-full p-3 border rounded-xl bg-white">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Contact</label>
                    <PhoneInput required value={passengerForm.contact} onChange={(val) => setPassengerForm({ ...passengerForm, contact: val })} placeholder="700 000 000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Residence</label>
                    <input required value={passengerForm.residence} onChange={e => setPassengerForm({ ...passengerForm, residence: e.target.value })} className="w-full p-3 border rounded-xl bg-white" />
                  </div>
                </div>

                {/* New Contact Type Selector for Students */}
                {passengerForm.category === 'Student' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Contact Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                        <input
                          type="radio"
                          name="contactType"
                          value="Personal"
                          checked={!passengerForm.parentContact} // If parentContact is empty/undefined, it's Personal (default logic)
                          onChange={() => {
                            // Clearing parent contact implies personal contact is now primary
                            setPassengerForm(prev => ({ ...prev, parentContact: undefined }));
                          }}
                          className="form-radio text-ministry-orange focus:ring-ministry-orange"
                        />
                        <span className="text-sm font-medium">Personal Contact</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                        <input
                          type="radio"
                          name="contactType"
                          value="Parent"
                          checked={(passengerForm as any).isParentContact === true}
                          onChange={(e) => {
                            if (e.target.value === 'Parent') {
                              setPassengerForm(prev => ({ ...prev, isParentContact: true } as any));
                            } else {
                              setPassengerForm(prev => {
                                const copy = { ...prev };
                                delete (copy as any).isParentContact;
                                return copy;
                              });
                            }
                          }}
                          className="form-radio text-ministry-orange focus:ring-ministry-orange"
                        />
                        <span className="text-sm font-medium">Parent Contact</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Are you going with us for the first time?</label>
                  <select value={passengerForm.isFirstTime} onChange={e => setPassengerForm({ ...passengerForm, isFirstTime: e.target.value })} className="w-full p-3 border rounded-xl bg-white">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                {passengerForm.category === 'Student' && (
                  <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Student Details</h4>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">School Name</label>
                      <input value={passengerForm.school} onChange={e => setPassengerForm({ ...passengerForm, school: e.target.value })} className="w-full p-3 border rounded-xl bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Class</label>
                        <input value={passengerForm.studentClass} onChange={e => setPassengerForm({ ...passengerForm, studentClass: e.target.value })} className="w-full p-3 border rounded-xl bg-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Section</label>
                        <select value={passengerForm.boardingType} onChange={e => setPassengerForm({ ...passengerForm, boardingType: e.target.value })} className="w-full p-3 border rounded-xl bg-white">
                          <option value="Day">Day Student</option>
                          <option value="Boarding">Boarding Student</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {passengerForm.category === 'Institution' && (
                  <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Institution Details</h4>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Name of Institute</label>
                      <input value={passengerForm.school} onChange={e => setPassengerForm({ ...passengerForm, school: e.target.value })} className="w-full p-3 border rounded-xl bg-white" placeholder="e.g. Makerere University" />
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-4 gap-3">
                  <button type="button" onClick={() => setIsAddPassengerOpen(false)} className="px-4 py-2 text-gray-600 font-bold">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange">
                    {passengerForm.id ? "Update Passenger" : "Add to Vehicle"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Add Event/Service Modal */}
      {
        isAddEventOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl p-8 rounded-2xl shadow-2xl h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-6 flex items-center">
                <CalendarPlus className="w-5 h-5 mr-2 text-ministry-orange" />
                {eventFormType === 'Service' ? "Add New Service" : "Add New Event"}
              </h3>
              <form onSubmit={handleAddEvent} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Title / Theme</label>
                  <input
                    required
                    value={eventForm.title}
                    onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-ministry-orange outline-none transition-all"
                    placeholder={eventFormType === 'Service' ? "e.g. Sunday Service" : "e.g. Men's Conference"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Date</label>
                    <input
                      type="date"
                      required
                      value={eventForm.date}
                      onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Time</label>
                    <input
                      type="time"
                      required
                      value={eventForm.time}
                      onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                      className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Location</label>
                  <input
                    required
                    value={eventForm.location}
                    onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Description (Optional)</label>
                  <textarea
                    value={eventForm.description}
                    onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none h-24 resize-none"
                    placeholder="Details about this gathering..."
                  />
                </div>
                <div className="flex justify-end pt-4 gap-3">
                  <button type="button" onClick={() => setIsAddEventOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange transition-colors shadow-md">
                    Create {eventFormType}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Children Count Modal */}
      {
        isAddChildrenOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold mb-4">Children Count</h3>
              <p className="text-sm text-gray-500 mb-4">Adding children count for {selectedVehicle?.number_plate}</p>
              <form onSubmit={handleUpdateChildrenCount} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Number of Children</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={childrenForm.count}
                    onChange={e => setChildrenForm({ ...childrenForm, count: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full p-3 border rounded-xl bg-white text-lg font-bold appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end pt-4 gap-3">
                  <button type="button" onClick={() => setIsAddChildrenOpen(false)} className="px-4 py-2 text-gray-600 font-bold">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange">Save Count</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Highlights Modal */}
      <EventDetailsModal
        event={showHighlights ? highlightEvent : null}
        onClose={() => setShowHighlights(false)}
      />
    </div >

  );
};

export default RegistrationDashboard;
