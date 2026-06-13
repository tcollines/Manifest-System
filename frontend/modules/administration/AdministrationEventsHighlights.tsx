import React, { useState, useEffect } from 'react';
import { MinistryEvent } from '../../types';
import { EventStore } from '../../database/eventStore';
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
  UserPlus
} from 'lucide-react';

const AdministrationEventsHighlights: React.FC = () => {
  const { showToast } = useNotification();
  const [events, setEvents] = useState<MinistryEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Events Highlights</h2>
          <p className="text-gray-500">Aggregated insights and logistics data for major events.</p>
        </div>

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
