import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { MinistryEvent } from '../../types';
import { EventStore } from '../../database/eventStore';
import { VehicleStore } from '../../database/vehicleStore';
import { useNotification } from '../../components/ui/NotificationSystem';
import {
  Calendar,
  Clock,
  Bus,
  Users,
  Home,
  GraduationCap,
  Building,
  Award,
  Wallet,
  Baby,
  UserPlus,
  Download,
  Car
} from 'lucide-react';

const AdministrationEventsHighlights: React.FC = () => {
  const { showToast } = useNotification();
  const [events, setEvents] = useState<MinistryEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [highlights, setHighlights] = useState<any>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await EventStore.getAll({ limit: 100 });
      if (res.status === 'success') {
        const onlyEvents = res.data.filter(e => e.type === 'Event');
        setEvents(onlyEvents);
        if (onlyEvents.length > 0) {
          setSelectedEventId(onlyEvents[0].id);
        }
      }
    } catch (error) {
      showToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadHighlights(selectedEventId);
    }
  }, [selectedEventId]);

  const loadHighlights = async (eventId: string) => {
    try {
      const data = await EventStore.getHighlights(eventId);
      if (data) {
        setHighlights(data);
      }
    } catch (error) {
      console.error('Failed to fetch event highlights', error);
      showToast('Failed to load event highlights', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div>
      </div>
    );
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Pending / Evaluating...';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const exportToExcel = async () => {
    if (!selectedEventId || !highlights) {
      showToast('No event selected or no highlights available.', 'error');
      return;
    }
    setExporting(true);
    try {
      // 1. Fetch Vehicles and Passengers
      const vehiclesRes = await VehicleStore.getVehicles({ eventId: selectedEventId });
      const vehicles = (vehiclesRes.status === 'success' && vehiclesRes.data) ? vehiclesRes.data : [];
      const passengersRes = await VehicleStore.getPassengers({ eventId: selectedEventId });
      const passengers = (passengersRes.status === 'success' && passengersRes.data) ? passengersRes.data : [];

      // Sheet 1: Summary
      const summaryData = [
        { Metric: 'Set off time', Value: formatTime(highlights.setOffTime) },
        { Metric: 'Est Arrival', Value: highlights.estimatedArrival },
        { Metric: 'Total Transported', Value: highlights.attendees },
        { Metric: 'Residentials / Comm', Value: highlights.residentials },
        { Metric: 'Students Transported', Value: highlights.students },
        { Metric: 'From Institutions', Value: highlights.institutions },
        { Metric: 'VIPs', Value: highlights.vips },
        { Metric: 'Total Budget (UGX)', Value: highlights.expenditure },
        { Metric: 'Total Children', Value: highlights.children },
        { Metric: 'Total First Timers', Value: highlights.firstTimers }
      ];

      // Sheet 2: Passengers
      const passengersData = passengers.map(p => {
        const vehicle = vehicles.find(v => v.id === p.vehicleId);
        return {
          Name: p.name,
          Contact: p.contact,
          Category: p.category,
          Residence: p.residence,
          'Is First Time': p.isFirstTime,
          Verified: p.verified ? 'Yes' : 'No',
          School: p.school || 'N/A',
          'Vehicle Number Plate': vehicle ? vehicle.number_plate : 'Unknown'
        };
      });

      // Sheet 3: Vehicles Info
      const passengerCounts: Record<string, number> = {};
      passengers.forEach(p => {
        if (p.vehicleId) {
          passengerCounts[p.vehicleId] = (passengerCounts[p.vehicleId] || 0) + 1;
        }
      });
      const vehiclesData = vehicles.map(v => ({
        'Number Plate': v.number_plate,
        Type: v.type,
        'Driver Name': v.driverName,
        'Driver Contact': v.driverContact,
        Coordinator: v.coordinator,
        'Coordinator Contact': v.coordinatorContact || 'N/A',
        Status: v.status,
        Stage: v.currentStage || 'N/A',
        'Total Passengers': passengerCounts[v.id] || 0
      }));

      // Sheet 4: Finance Breakdown
      const financeData = vehicles.map(v => {
        const ongoingDisp = parseFloat(v.financeDetails?.ongoingDispatch || '0');
        const ongoingBal = parseFloat(v.financeDetails?.ongoingBalance || '0');
        const returnDisp = parseFloat(v.financeDetails?.returnDispatch || '0');
        const returnBal = parseFloat(v.financeDetails?.returnBalance || '0');
        
        return {
          'Number Plate': v.number_plate,
          Coordinator: v.coordinator,
          'Ongoing Dispatch (UGX)': ongoingDisp,
          'Ongoing Balance (UGX)': ongoingBal,
          'Return Dispatch (UGX)': returnDisp,
          'Return Balance (UGX)': returnBal,
          'Total Dispatched (UGX)': ongoingDisp + returnDisp,
          'Total Balances (UGX)': ongoingBal + returnBal,
        };
      });

      // Create Workbook
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      const ws2 = XLSX.utils.json_to_sheet(passengersData);
      const ws3 = XLSX.utils.json_to_sheet(vehiclesData);
      const ws4 = XLSX.utils.json_to_sheet(financeData);

      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
      XLSX.utils.book_append_sheet(wb, ws2, 'Passengers');
      XLSX.utils.book_append_sheet(wb, ws3, 'Vehicles Info');
      XLSX.utils.book_append_sheet(wb, ws4, 'Finance Breakdown');

      const eventName = events.find(e => e.id === selectedEventId)?.title || 'Event';
      XLSX.writeFile(wb, `${eventName}_Data.xlsx`);
      showToast('Export successful!', 'success');
    } catch (error) {
      console.error('Export failed', error);
      showToast('Failed to export event data', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Events Highlights</h2>
          <p className="text-gray-500">Aggregated insights and logistics data for major events.</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          {selectedEventId && highlights && (
            <button
              onClick={exportToExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Download size={18} />
              )}
              {exporting ? 'Exporting...' : 'Export Event Data'}
            </button>
          )}
          <div className="flex-shrink-0 min-w-[250px]">
            <select
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange font-bold text-gray-700 shadow-sm transition-all"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              {events.length === 0 ? (
                <option value="">No Events Found</option>
              ) : (
                events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} - {new Date(e.date).toLocaleDateString()}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {!selectedEventId && !loading && (
        <div className="py-12 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Please create an Event to view highlights.</p>
        </div>
      )}

      {selectedEventId && highlights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Clock size={20} />
              </div>
              <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wider">Set off time</h3>
            </div>
            <p className="text-xl font-black text-gray-900 mt-2 truncate">
              {formatTime(highlights.setOffTime)}
            </p>
            <p className="text-xs text-orange-600 mt-1">First vehicle departure</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Bus size={20} />
              </div>
              <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Est Arrival</h3>
            </div>
            <p className="text-xl font-black text-gray-900 mt-2 truncate">
              {highlights.estimatedArrival}
            </p>
            <p className="text-xs text-blue-600 mt-1">For all vehicles</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-6 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Users size={20} />
              </div>
              <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Total Transported</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {(highlights.attendees || 0).toLocaleString()}
            </p>
            <p className="text-xs text-indigo-600 mt-1">Total passengers</p>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 p-6 rounded-2xl border border-teal-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-teal-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Car size={20} />
              </div>
              <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">Private Commuters</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {(highlights.personalCars || 0).toLocaleString()}
            </p>
            <p className="text-xs text-teal-600 mt-1">Personal / Private Vehicles</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Home size={20} />
              </div>
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Residentials / Comm</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {(highlights.residentials || 0).toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 mt-1">Added via Members</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <GraduationCap size={20} />
              </div>
              <h3 className="text-xs font-bold text-purple-800 uppercase tracking-wider">Students Transported</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {(highlights.students || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 p-6 rounded-2xl border border-pink-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-pink-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Building size={20} />
              </div>
              <h3 className="text-xs font-bold text-pink-800 uppercase tracking-wider">From Institutions</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {(highlights.institutions || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-6 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Award size={20} />
              </div>
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">VIPs</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {highlights.vips || 0}
            </p>
            <p className="text-xs text-amber-600 mt-1">Pastors and Dignitaries</p>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 p-6 rounded-2xl border border-teal-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-teal-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Wallet size={20} />
              </div>
              <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">Total Budget</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              <span className="text-xl">UGX</span> {(highlights.expenditure || 0).toLocaleString()}
            </p>
            <p className="text-xs text-teal-600 mt-1">Total recorded expenditure</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 p-6 rounded-2xl border border-cyan-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-cyan-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Baby size={20} />
              </div>
              <h3 className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Total Children</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {(highlights.children || 0).toLocaleString()}
            </p>
            <p className="text-xs text-cyan-600 mt-1">From logistics</p>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 p-6 rounded-2xl border border-violet-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-violet-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                <UserPlus size={20} />
              </div>
              <h3 className="text-xs font-bold text-violet-800 uppercase tracking-wider">Total First Timers</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {(highlights.firstTimers || 0).toLocaleString()}
            </p>
            <p className="text-xs text-violet-600 mt-1">New attendees</p>
          </div>

        </div>
      )}
    </div>
  );
};

export default AdministrationEventsHighlights;
