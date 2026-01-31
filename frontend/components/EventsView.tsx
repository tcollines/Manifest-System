import React, { useState, useEffect } from 'react';
import { MinistryEvent } from '../types';
import EventDetailsModal from './EventDetailsModal';
import { Clock, MapPin, ChevronRight, Search, ChevronLeft } from 'lucide-react';
import { EventStore } from '../database/eventStore';

const EventsView: React.FC = () => {
  const [events, setEvents] = useState<MinistryEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MinistryEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Events
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const result = await EventStore.getAll({
          page,
          limit: 12, // Grid 3x4
          search: debouncedSearch
        });

        if (result.status === 'success') {
          setEvents(result.data);
          if (result.count !== undefined) {
            setTotalPages(Math.ceil(result.count / 12));
          } else {
            // Fallback if count missing
            setTotalPages(1);
          }
        } else {
          // Error State
          console.error("Failed to load events:", result.message);
          // Ideally show a toast
        }

      } catch (error) {
        // Should catch errors thrown by safeFetch if strict, or unexpected component errors
        console.error("Critical error loading events", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [page, debouncedSearch]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ministry-text mb-1">Events & Services</h1>
          <p className="text-gray-500">Manage church calendar, track attendance, and view service highlights.</p>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-ministry-orange transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm text-ministry-text focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange mx-auto mb-4"></div>
          <p className="text-gray-500">Loading events...</p>
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-ministry-card border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-ministry-orange/30 transition-all duration-300 group flex flex-col h-96">

              {/* Scrollable Content Area */}
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.type === 'Service'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                    }`}>
                    {event.type}
                  </span>
                  <span className="text-sm font-medium text-gray-400">{event.date}</span>
                </div>

                <h3 className="text-xl font-bold text-ministry-text mb-2">{event.title}</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2 text-ministry-orange" />
                    {event.time}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mr-2 text-ministry-orange" />
                    {event.location}
                  </div>
                </div>

                <p className="text-gray-500 text-sm leading-relaxed">{event.description}</p>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="w-full bg-white border border-gray-200 text-ministry-text font-semibold py-2.5 rounded-xl hover:bg-ministry-text hover:text-white hover:border-ministry-text transition-all flex items-center justify-center group-hover:shadow-md"
                >
                  <span>View Highlights</span>
                  <ChevronRight className="w-4 h-4 ml-2 opacity-60" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-8 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p>No events found.</p>
        </div>
      )}

      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};

export default EventsView;