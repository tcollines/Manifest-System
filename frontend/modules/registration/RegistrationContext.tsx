import React, { useState, useEffect, useRef, createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { useNotification, NotificationProvider } from '../../components/ui/NotificationSystem';

// Stores
import { MemberStore } from '../../database/memberStore';
import { LogisticsStore } from '../../database/logisticsStore';
import { VehicleStore } from '../../database/vehicleStore';
import { EventStore } from '../../database/eventStore';
import { ManifestStore } from '../../database/manifestStore';
import { SoulsStore } from '../../database/soulsStore';
import { UserStore } from '../../database/userStore';

import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';

// Types
import { Member, Passenger, PickUpStation, Vehicle, PersonalVehicle, MinistryEvent, User, ModalType, ServiceResponse } from '../../types';
import { mapUserFromDB } from '../../database/userStore';
import { mapVehicleFromDB, mapPassengerFromDB, mapPersonalVehicleFromDB } from '../../database/vehicleStore';
import { mapStationFromDB, ExtendedStation } from '../../database/logisticsStore';

export type Tab = 'checkin' | 'events' | 'finance' | 'parking' | 'settings' | 'team';
export type ViewMode = 'list' | 'station-detail' | 'register-new' | 'service-active';
import { validateContact, validateDriverIdentity, isServiceClosed, validatePlate } from '../../utils';

// Components

import {
  CalendarPlus, Key, Calendar, CheckCircle, History, UserIcon, BarChart3,
  CalendarCheck, Users, ArrowLeft, Eye, Trash2, Loader2, Search, Download,
  FileSpreadsheet, Plus, AlertTriangle
} from 'lucide-react';
import {
  hasLogisticsAccess,
  canDeleteLogistics,
  hasElevatedRegistrationRole,
  canCreateService,
  isTeamLeader,
  isMemberRole
} from '../../domain/rbac';

export const RegistrationContext = createContext<any>(null);

export const useRegistration = () => {
    const ctx = useContext(RegistrationContext);
    if (!ctx) throw new Error('useRegistration must be used inside RegistrationProvider');
    return ctx;
};

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const { user: currentUser } = useAuth();
  const { events, refreshEvents: refreshParentData, isLoading: isEventsLoading } = useEvent();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as any;
  const { showToast, confirm: askConfirm } = useNotification();


  

  // [PHASE B] activeTab is now URL-driven when urlTab prop is provided.
  // Internal state is kept as a fallback for Logistics role-forcing effects.
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (urlTab) return urlTab;
    if (hasLogisticsAccess(currentUser)) return 'events';
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (hasLogisticsAccess(currentUser) && currentUser?.stationId && !searchParams.get('vehicleId')) {
      const cachedStation = localStorage.getItem(`cached_logistics_station_${currentUser.id}`);
      if (cachedStation) return 'station-detail';
    }
    return 'list';
  });

  // Force 'events' tab for Logistics users to prevent flicker if role updates late
  useEffect(() => {
    if (hasLogisticsAccess(currentUser) && activeTab !== 'events') {
      setActiveTab('events');
    }
  }, [currentUser, activeTab]);


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
    if (hasLogisticsAccess(currentUser) && (viewMode === 'register-new' || viewMode === 'checkin')) {
      setViewMode('list');
    }
  }, [viewMode, selectedService, currentUser]);

  // Logistics Hierarchy State
  // Logistics Hierarchy State
  const [selectedLogisticsEvent, _setSelectedLogisticsEvent] = useState<MinistryEvent | null>(() => {
    if (hasLogisticsAccess(currentUser) && currentUser?.stationId) {
      const cached = localStorage.getItem(`cached_logistics_event_${currentUser.id}`);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  
  const setSelectedLogisticsEvent = (obj: MinistryEvent | null | ((prev: MinistryEvent | null) => MinistryEvent | null)) => {
    if (obj && typeof obj !== 'function') {
       setSearchParams(prev => {
         prev.set('eventId', (obj as MinistryEvent).id);
         prev.delete('stationId'); prev.delete('vehicleId');
         return prev;
       });
    } else if (!obj) {
       setSearchParams(prev => { prev.delete('eventId'); return prev; });
    }
    _setSelectedLogisticsEvent(obj);
  }; // Level 1 -> 2

  const [selectedStation, _setSelectedStation] = useState<ExtendedStation | null>(() => {
    if (hasLogisticsAccess(currentUser) && currentUser?.stationId) {
      const cached = localStorage.getItem(`cached_logistics_station_${currentUser.id}`);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  
  const setSelectedStation = (obj: ExtendedStation | null | ((prev: ExtendedStation | null) => ExtendedStation | null)) => {
    if (obj && typeof obj !== 'function') {
       setSearchParams(prev => {
         prev.set('stationId', (obj as ExtendedStation).id);
         prev.delete('vehicleId');
         return prev;
       });
    } else if (!obj) {
       setSearchParams(prev => { prev.delete('stationId'); return prev; });
    }
    _setSelectedStation(obj);
  }; // Level 2 -> 3
  const [selectedVehicle, _setSelectedVehicle] = useState<Vehicle | null>(null);
  
  const setSelectedVehicle = (obj: Vehicle | null | ((prev: Vehicle | null) => Vehicle | null)) => {
    if (obj && typeof obj !== 'function') {
       setSearchParams(prev => {
         prev.set('vehicleId', (obj as Vehicle).id);
         // No child params to delete
         return prev;
       });
    } else if (!obj) {
       setSearchParams(prev => { prev.delete('vehicleId'); return prev; });
    }
    _setSelectedVehicle(obj);
  }; // Level 3 -> 4


  // Logistics: Auto-Select Station if assigned
  // Loading state to prevent flicker of "Select Event" screen
  const [isLogisticsInitializing, setIsLogisticsInitializing] = useState(() => {
    // If we have a cache, we don't need to initialize (show skeleton). It's instant.
    if (hasLogisticsAccess(currentUser) && currentUser?.stationId) {
      const cachedStation = localStorage.getItem(`cached_logistics_station_${currentUser.id}`);
      const cachedEvent = localStorage.getItem(`cached_logistics_event_${currentUser.id}`);
      if (cachedStation && cachedEvent) return false;
      return true;
    }
    return false;
  });

  useEffect(() => {
    const autoSelectStation = async () => {
      console.log("AutoSelect Trace: Start", { role: currentUser?.role, stId: currentUser?.stationId });

      if (hasLogisticsAccess(currentUser) && currentUser?.stationId && !selectedStation) {
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

            // Fetch event directly to bypass slow global event loading
            const { data: eventData } = await supabase
              .from('ministry_events')
              .select('*')
              .eq('id', stationData.event_id)
              .single();

            console.log("AutoSelect Trace: Related Event DB", eventData);

            if (eventData) {
              // Map DB fields to MinistryEvent interface
              const relatedEvent = {
                id: eventData.id,
                title: eventData.title,
                type: eventData.type,
                date: eventData.date,
                time: eventData.time,
                location: eventData.location,
                description: eventData.description,
                stats: eventData.stats || { attendees: 0, firstTimers: 0, soulsWon: 0, students: 0, expenditure: '$0.00', nextGen: 0 },
                serviceNumber: eventData.service_number,
                createdAt: eventData.created_at,
                lat: eventData.latitude ? parseFloat(eventData.latitude) : undefined,
                lng: eventData.longitude ? parseFloat(eventData.longitude) : undefined,
                locationName: eventData.location_name
              };
              
              _setSelectedLogisticsEvent(relatedEvent);
              _setSelectedStation(station);
              
              // Cache to localStorage for instant load next time
              localStorage.setItem(`cached_logistics_event_${currentUser.id}`, JSON.stringify(relatedEvent));
              localStorage.setItem(`cached_logistics_station_${currentUser.id}`, JSON.stringify(station));

              if (!searchParams.get('vehicleId')) {
                setViewMode('station-detail');
              }
            }
          }
        } catch (err) {
          console.error("Auto-select station failed", err);
        } finally {
          setIsLogisticsInitializing(false);
        }
      } else if (!currentUser?.stationId) {
        setIsLogisticsInitializing(false);
      }
    };
    autoSelectStation();
  }, [currentUser, selectedStation, searchParams]);

  const [stationEntrants, setStationEntrants] = useState<User[]>([]);

  // Logistics Data
  const [stations, setStations] = useState<ExtendedStation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  // Sync drill-down state with URL parameters (for direct linking & back button)
  useEffect(() => {
    const urlEventId = searchParams.get('eventId');
    const urlStationId = searchParams.get('stationId');
    const urlVehicleId = searchParams.get('vehicleId');

    // Prevent wiping the cache for Logistics users who just landed on the base URL
    if (hasLogisticsAccess(currentUser) && currentUser?.stationId) {
       if (!urlEventId && selectedLogisticsEvent && selectedStation) {
          // We have cached state, but URL is empty. Sync URL UP to match state instantly.
          setSearchParams(prev => {
             prev.set('eventId', selectedLogisticsEvent.id);
             prev.set('stationId', selectedStation.id);
             if (selectedVehicle) prev.set('vehicleId', selectedVehicle.id);
             return prev;
          }, { replace: true });
          return;
       }
    }

    if (urlEventId && (!selectedLogisticsEvent || selectedLogisticsEvent.id !== urlEventId)) {
       const found = events.find(e => e.id === urlEventId);
       if (found) _setSelectedLogisticsEvent(found);
    } else if (!urlEventId && selectedLogisticsEvent) {
       _setSelectedLogisticsEvent(null);
    }
    
    if (urlStationId && (!selectedStation || selectedStation.id !== urlStationId)) {
       const found = stations.find(s => s.id === urlStationId);
       if (found) _setSelectedStation(found);
    } else if (!urlStationId && selectedStation) {
       _setSelectedStation(null);
    }
    
    if (urlVehicleId && (!selectedVehicle || selectedVehicle.id !== urlVehicleId)) {
       const found = vehicles.find(v => v.id === urlVehicleId);
       if (found) _setSelectedVehicle(found);
    } else if (!urlVehicleId && selectedVehicle) {
       _setSelectedVehicle(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, events, stations, vehicles]);

  const [passengers, setPassengers] = useState<Passenger[]>([]);

  // Parking State
  const [personalVehicles, setPersonalVehicles] = useState<PersonalVehicle[]>([]);
    const isAddParkingOpen = searchParams.get('modal') === 'add-parking';
  const setIsAddParkingOpen = (isOpen: boolean) => {
    setSearchParams(prev => {
      if (isOpen) prev.set('modal', 'add-parking');
      else prev.delete('modal');
      return prev;
    });
  };
  const [parkingForm, setParkingForm] = useState({ number_plate: '', driverName: '', driverContact: '256' });

  // Add Station Form State
    const isAddStationOpen = searchParams.get('modal') === 'add-station';
  const setIsAddStationOpen = (isOpen: boolean) => {
    setSearchParams(prev => {
      if (isOpen) prev.set('modal', 'add-station');
      else prev.delete('modal');
      return prev;
    });
  };

  const initialStationForm = {
    name: '',
    location: '',
    coordinatorName: '',
    coordinatorContact: '',
    entrantName: '',
    entrantContact: '',
    entrantUsername: '',
    entrantPassword: '',
    id: ''
  };
  const [stationForm, setStationForm] = useState(initialStationForm);



  // Data Entrant - Add Entrant State
    const isAddEntrantOpen = searchParams.get('modal') === 'add-entrant';
  const setIsAddEntrantOpen = (isOpen: boolean) => {
    setSearchParams(prev => {
      if (isOpen) prev.set('modal', 'add-entrant');
      else prev.delete('modal');
      return prev;
    });
  };
  const [newEntrant, setNewEntrant] = useState({ name: '', username: '', password: '', email: '' });



  // Data Entrant - Add Vehicle State
    const isAddVehicleOpen = searchParams.get('modal') === 'add-vehicle';
  const setIsAddVehicleOpen = (isOpen: boolean) => {
    setSearchParams(prev => {
      if (isOpen) prev.set('modal', 'add-vehicle');
      else prev.delete('modal');
      return prev;
    });
  };
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
    const isAddPassengerOpen = searchParams.get('modal') === 'add-passenger';
  const setIsAddPassengerOpen = (isOpen: boolean) => {
    setSearchParams(prev => {
      if (isOpen) prev.set('modal', 'add-passenger');
      else prev.delete('modal');
      return prev;
    });
  };
    const isAddChildrenOpen = searchParams.get('modal') === 'add-children';
  const setIsAddChildrenOpen = (isOpen: boolean) => {
    setSearchParams(prev => {
      if (isOpen) prev.set('modal', 'add-children');
      else prev.delete('modal');
      return prev;
    });
  };
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
    boardingType: 'Day',
    id: ''
  };
  const [passengerForm, setPassengerForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem('manifest_passengerForm');
      return saved ? JSON.parse(saved) : initialPassengerForm;
    } catch {
      return initialPassengerForm;
    }
  });

  useEffect(() => {
    sessionStorage.setItem('manifest_passengerForm', JSON.stringify(passengerForm));
  }, [passengerForm]);

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
  // const [searchParams, setSearchParams] = useSearchParams(); // Already declared above
  const selectedEventId = searchParams.get('eventId') || events.find(e => e.type === 'Event')?.id || '';
  const setSelectedEventId = (id: string) => {
    setSearchParams(prev => {
      if (id) prev.set('eventId', id);
      else prev.delete('eventId');
      return prev;
    }, { replace: true });
  };

  // Sync viewMode when browser back/forward changes URL params
  const urlView = searchParams.get('view');
  const urlServiceId = searchParams.get('serviceId');
  useEffect(() => {
    // Browser back removed ?view= — snap out of the form
    if (!urlView && viewMode === 'register-new') {
      setViewMode(urlServiceId ? 'service-active' : 'list');
    }
    // Browser back removed ?serviceId= — snap out of service-active back to list
    if (!urlServiceId && (viewMode === 'service-active' || viewMode === 'register-new')) {
      setViewMode('list');
    }
  }, [urlView, urlServiceId]);
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [eventToDelete, setEventToDelete] = useState<MinistryEvent | null>(null);

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // New Event/Service State
    const isAddEventOpen = searchParams.get('modal') === 'add-event';
  const setIsAddEventOpen = (isOpen: boolean) => {
    setSearchParams(prev => {
      if (isOpen) prev.set('modal', 'add-event');
      else prev.delete('modal');
      return prev;
    });
  };
  const [eventFormType, setEventFormType] = useState<'Service' | 'Event'>('Service');
  const [eventForm, setEventForm] = useState<{
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
    lat?: number;
    lng?: number;
    locationName?: string;
  }>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '17:00',
    location: 'EMF Grounds',
    description: ''
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Highlights Modal State
    const showHighlights = searchParams.get('modal') === 'highlights';
  const setShowHighlights = (isOpen: boolean) => {
    setSearchParams(prev => {
      if (isOpen) prev.set('modal', 'highlights');
      else prev.delete('modal');
      return prev;
    });
  };
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
    const manifestId = currentUser.manifestId || (currentUser as any).manifest_id;
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
          // Enforce strict service scope
          filter: `service_id=eq.${selectedService.id}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // Double verification just to be safe (with case insensitivity)
          const newServiceId = newRecord ? (newRecord as any).service_id : null;
          const oldServiceId = oldRecord ? (oldRecord as any).service_id : null;
          
          if (newServiceId && newServiceId.toLowerCase() !== selectedService.id.toLowerCase()) return;
          if (oldServiceId && oldServiceId.toLowerCase() !== selectedService.id.toLowerCase()) return;

          if (eventType === 'INSERT') {
            const memberId = ((newRecord as any).member_id || '').toLowerCase();
            
            // Early return if already checked in locally
            if (checkedInIdsRef.current.has(memberId)) return;

            // Update first timer stats if this member is a first timer
            const member = membersRef.current.find(m => m.id.toLowerCase() === memberId);
            if (member) {
              if (member.category === 'First Timer') {
                setCheckInStats(stats => ({ ...stats, firstTimers: stats.firstTimers + 1 }));
              }
            } else {
              // Member not loaded locally (newly registered on another device)
              MemberStore.getById(memberId).then((data) => {
                if (data && data.category === 'First Timer') {
                  setCheckInStats(stats => ({ ...stats, firstTimers: stats.firstTimers + 1 }));
                }
              });
            }

            setCheckedInIds(prev => {
              const next = new Set(prev);
              next.add(memberId);
              // total is dynamically derived from checkedInIds.size
              return next;
            });
          } else if (eventType === 'DELETE') {
            const memberId = ((oldRecord as any).member_id || '').toLowerCase();
            
            // Early return if not checked in locally
            if (!checkedInIdsRef.current.has(memberId)) return;

            // Update first timer stats if this member is a first timer
            const member = membersRef.current.find(m => m.id.toLowerCase() === memberId);
            if (member) {
              if (member.category === 'First Timer') {
                setCheckInStats(stats => ({ ...stats, firstTimers: Math.max(0, stats.firstTimers - 1) }));
              }
            } else {
              MemberStore.getById(memberId).then((data) => {
                if (data && data.category === 'First Timer') {
                  setCheckInStats(stats => ({ ...stats, firstTimers: Math.max(0, stats.firstTimers - 1) }));
                }
              });
            }

            setCheckedInIds(prev => {
              const next = new Set(prev);
              next.delete(memberId);
              // total is dynamically derived
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

    const channel_events = supabase
      .channel(`service-events-${selectedService.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ministry_events',
          filter: `id=eq.${selectedService.id}`
        },
        (payload) => {
          const updatedEvent = payload.new as any;
          setSelectedService(prev => prev ? { ...prev, stats: updatedEvent.stats || prev.stats } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channel_souls);
      supabase.removeChannel(channel_events);
    };
  }, [selectedService?.id, viewMode, currentUser.manifestId, (currentUser as any).manifest_id]);


  // Robust Role Check: Case-insensitive and includes Department ID 'd5' (Transportation/Logistics) - Fixes Data Entrant Guard
  // TODO: Refactor to use Department Slug from Global Context/Store
  const isLogisticsRole = hasLogisticsAccess(currentUser);

  // Permission for Deletion: Head of Dept or Administration Department (d0) or Administrator
  const canDeleteLogisticsRule = canDeleteLogistics(currentUser);

  const effectiveTab = isLogisticsRole ? 'events' : activeTab; // Force 'events' for Logistics to prevents flicker
  // Force 'list' viewMode for Logistics if they somehow landed on 'register-new' (which is for Check-In)
  if (isLogisticsRole && viewMode === 'register-new') {
    // This is a side-effect in render, but react specific pattern is to use useEffect
    // We will handle this in useEffect below, but valid for effectiveView logic.
  }
  const isMember = isMemberRole(currentUser);
  const _canCreateService = canCreateService(currentUser);

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
  const logisticsEvents = useMemo(() => events.filter(e => e.type === 'Event').sort(sortEvents), [events]);

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

  // Clean up pending requests when the context is unmounted (e.g. on logout)
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
    setSearchParams(prev => { prev.set('serviceId', service.id); return prev; }, { replace: true });
    // Fetch initial stats
    const stats = await MemberStore.getServiceStats(service.id, service.date);
    const souls = await SoulsStore.getServiceStats(service.id);
    const childrenCount = service.stats?.manualChildrenCount || 0;
    setCheckInStats({ total: 0, firstTimers: stats.firstTimers, soulsWon: souls });
    setCheckedInIds(new Set(stats.memberIds));
  };

  /* --- DOWNLOAD HIGHLIGHTS --- */
  const handleDownloadHighlights = () => {
    if (!selectedService) return;

    const stats = [
      ['Metric', 'Value'],
      ['Service Title', selectedService.title],
      ['Date', selectedService.date],
      ['Total Members Checked In', checkedInIds.size + (selectedService.stats?.manualChildrenCount || 0)],
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
      setSearchParams(prev => { prev.delete('view'); return prev; }, { replace: true });
    } else {
      // Otherwise (from Service Dashboard OR from Register New with no service), go to list
      setViewMode('list');
      setSelectedService(null);
      setSearchParams(prev => { prev.delete('serviceId'); prev.delete('view'); return prev; }, { replace: true });
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
          setCheckInStats({ total: 0, firstTimers: stats.firstTimers, soulsWon: checkInStats.soulsWon });
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
      const member = members.find(m => m.id === memberId);
      setCheckInStats(prev => ({
        ...prev,
        total: prev.total + 1,
        firstTimers: (member && member.category === 'First Timer') ? prev.firstTimers + 1 : prev.firstTimers
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

      const member = members.find(m => m.id === memberId);
      setCheckInStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        firstTimers: (member && member.category === 'First Timer') ? Math.max(0, prev.firstTimers - 1) : prev.firstTimers
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
        setCheckInStats({ total: 0, firstTimers: stats.firstTimers, soulsWon: checkInStats.soulsWon });
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
        // Enforce coordinator uniqueness strictly for the SAME event
        const existingVehicleStation = stations.find(s => s.id === existingCoordVehicle.stationId);
        if (existingVehicleStation && existingVehicleStation.eventId === selectedStation.eventId) {
          showToast(`Error: Coordinator "${vehicleForm.coordinator}" is already assigned to vehicle ${existingCoordVehicle.number_plate} in this event.`, 'error');
          return;
        }
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

        // Clear session storage just in case user comes back clean layout
        sessionStorage.removeItem('manifest_vehicleForm');
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
    if (isSubmittingEvent) return;

    // Duplicate check
    const isDuplicate = events.some(ev => 
      ev.title.trim().toLowerCase() === eventForm.title.trim().toLowerCase() && 
      ev.date === eventForm.date && 
      ev.type === eventFormType
    );
    if (isDuplicate) {
      showToast(`A ${eventFormType} with this name already exists on this date.`, 'warning');
      return;
    }

    setIsSubmittingEvent(true);
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
        stats: { attendees: 0, firstTimers: 0, soulsWon: 0, students: 0, expenditure: '$0.00', nextGen: 0 },
        lat: eventForm.lat,
        lng: eventForm.lng,
        locationName: eventForm.locationName
      };

      await EventStore.add(newEvent);
      if (refreshParentData) refreshParentData(); // Refresh parent data
      setIsAddEventOpen(false);
      setEventForm({ title: '', date: new Date().toISOString().split('T')[0], time: '17:00', location: 'EMF Grounds', description: '', lat: undefined, lng: undefined, locationName: undefined });
      showToast(`${eventFormType} created successfully.`, 'success');
    } catch (error: any) {
      console.error("Error creating event:", error);
      showToast("Failed to create event: " + error.message, 'error');
    } finally {
      setIsSubmittingEvent(false);
    }
  };



  const filteredMembers = useMemo(() => members.filter(m => {
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
  }), [members, activeTab, filterCategory, checkedInIds, searchQuery]);

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
        cohort: selectedStation!.cohort,
        registeredAttendees: selectedStation!.registeredAttendees,
        vehicleStatus: selectedStation!.vehicleStatus,
        eventId: selectedStation!.eventId,
        dataEntrantId: selectedStation!.dataEntrantId,
        dataEntrantName: stationForm.entrantName || selectedStation!.dataEntrantName,
        coordinatorName: selectedStation!.coordinatorName,
        coordinatorContact: selectedStation!.coordinatorContact,
        coordinatorEmail: selectedStation!.coordinatorEmail,
        dataEntrantContact: stationForm.entrantContact || selectedStation!.dataEntrantContact
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
              contact: stationForm.entrantContact
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
      eventId: selectedLogisticsEvent.id,
      registeredAttendees: 0,
      vehicleStatus: 'Pending',
      dataEntrantName: stationForm.entrantName,
      dataEntrantContact: stationForm.entrantContact
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
          contact: stationForm.entrantContact,
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
      email: newEntrant.email || undefined,
      role: 'Logistics',
      stationId: selectedStation.id,
      departmentId: currentUser.departmentId || '4630e48a-f97e-48fd-a901-864b591c282f' // Default to current user's department or Transportation UUID
    };

    try {
      const res = await UserStore.add(newUser);
      if (res.status === 'error') throw new Error(res.message);

      setIsAddEntrantOpen(false);
      setNewEntrant({ name: '', username: '', password: '', email: '' });
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

    const sanitize = (val?: string) => val ? val.trim() : undefined;

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
      
      // Clear session after successful submit
      sessionStorage.removeItem('manifest_passengerForm');
      setPassengerForm(initialPassengerForm);
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
    const apiUrl = (import.meta as any).env.VITE_API_URL || 'https://manifest-system-esft.onrender.com/api';
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
      // total is dynamically derived from selectedService.stats.manualChildrenCount update above

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

    const attendance = checkedInIds.size + (selectedService.stats?.manualChildrenCount || 0);
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



  const computedTotal = checkedInIds.size + (selectedService?.stats?.manualChildrenCount || 0);
  const derivedCheckInStats = {
    ...checkInStats,
    total: computedTotal
  };

  const contextValue = {
    isSubmittingEvent,
    events, 
    currentUser, 
    refreshParentData, 
    urlTab, 
    isLogisticsRole, 
    canDeleteLogistics: canDeleteLogisticsRule, 
    effectiveTab, 
    isMember, 
    canCreateService: _canCreateService, 
    services, 
    logisticsEvents, 
    debouncedSearchQuery, 
    abortControllerRef, 
    refreshData, 
    sortEvents, 
    isServiceClosed, 
    activeTab, 
    setActiveTab, 
    viewMode, 
    setViewMode, 
    members, 
    setMembers, 
    totalMembers, 
    setTotalMembers, 
    filteredMembers,
    itemsPerPage, 
    searchQuery, 
    setSearchQuery, 
    filterCategory, 
    setFilterCategory, 
    selectedService, 
    setSelectedService, 
    selectedLogisticsEvent, 
    setSelectedLogisticsEvent, 
    selectedStation, 
    setSelectedStation, 
    selectedVehicle, 
    setSelectedVehicle, 
    isLogisticsInitializing, 
    setIsLogisticsInitializing, 
    stationEntrants, 
    setStationEntrants, 
    stations, 
    setStations, 
    vehicles, 
    setVehicles, 
    passengers, 
    setPassengers, 
    personalVehicles, 
    setPersonalVehicles, 
    isAddParkingOpen, 
    setIsAddParkingOpen, 
    parkingForm, 
    setParkingForm, 
    isAddStationOpen, 
    setIsAddStationOpen, 
    stationForm, 
    setStationForm, 
    isAddEntrantOpen, 
    setIsAddEntrantOpen, 
    newEntrant, 
    setNewEntrant, 
    isAddVehicleOpen, 
    setIsAddVehicleOpen, 
    vehicleForm, 
    setVehicleForm, 
    isAddPassengerOpen, 
    setIsAddPassengerOpen, 
    isAddChildrenOpen, 
    setIsAddChildrenOpen, 
    childrenForm, 
    setChildrenForm, 
    passengerForm, 
    setPassengerForm, 
    formData, 
    setFormData, 
    bulkMemberText, 
    setBulkMemberText, 
    selectedMemberIds, 
    setSelectedMemberIds, 
    searchParams, 
    setSearchParams, 
    coordinators, 
    setCoordinators, 
    isDeleteModalOpen, 
    setIsDeleteModalOpen, 
    deletePassword, 
    setDeletePassword, 
    eventToDelete, 
    setEventToDelete, 
    isImporting, 
    setIsImporting, 
    importProgress, 
    setImportProgress, 
    isAddEventOpen, 
    setIsAddEventOpen, 
    eventFormType, 
    setEventFormType, 
    eventForm, 
    setEventForm, 
    showHighlights, 
    setShowHighlights, 
    highlightEvent, 
    setHighlightEvent, 
    isChildCountModalOpen, 
    setIsChildCountModalOpen, 
    checkInStats: derivedCheckInStats, 
    setCheckInStats, 
    checkedInIds, 
    setCheckedInIds, 
    checkedSoulIds, 
    setCheckedSoulIds, 
    selectedMemberDetails, 
    setSelectedMemberDetails, 
    isEditingMember, 
    setIsEditingMember, 
    currentPage, 
    setCurrentPage, 
    isSearching, 
    setIsSearching, 
    handleSelectStation, 
    handleOpenService, 
    handleDownloadHighlights, 
    handleBackLogistics, 
    handleBackRegistration, 
    handlePrintManifest, 
    handleInputChange, 
    handleRegister, 
    handleCheckInMember, 
    handleUndoCheckInMember, 
    handleViewMember, 
    handleUpdateMember, 
    handleAddVehicle, 
    handleParkingAction, 
    handleBulkMemberImport, 
    handleFileUpload, 
    handleAddEvent, 
    handleSelectAll, 
    handleSelectOne, 
    handleDeleteSelected, 
    handleAddStation, 
    handleAddExtraEntrant, 
    handleAddPassenger, 
    openAddMember, 
    openAddStudent, 
    openAddInstitution, 
    handleDeletePassenger, 
    handleApproveVehicle, 
    handleUpdateChildrenCount, 
    handleDeleteStation, 
    handleDeleteVehicle, 
    confirmDelete, 
    handleDeleteEvent, 
    handleUpdateManualCount, 
    handleCopyReport, 
    handleExportMembers, 
    refreshDataRef, 
    selectedServiceRef, 
    checkedInIdsRef, 
    membersRef
  };

  return (
    <RegistrationContext.Provider value={contextValue}>
      {children}
    </RegistrationContext.Provider>
  );
};
