import React, { useState } from 'react';
import { MOCK_EVENTS } from '../constants'; // Keep as fallback if needed, but mostly relying on props
import { MinistryEvent } from '../types';
import EventDetailsModal from './EventDetailsModal';
import { Calendar, Clock, MapPin, ChevronRight, Filter } from 'lucide-react';

interface EventsViewProps {
  events?: MinistryEvent[];
}

const EventsView: React.FC<EventsViewProps> = ({ events = MOCK_EVENTS }) => {
  const [selectedEvent, setSelectedEvent] = useState<MinistryEvent | null>(null);
  const [filter, setFilter] = useState<'All' | 'Service' | 'Event'>('All');

  // Sort events by date descending (newest first)
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredEvents = filter === 'All' 
    ? sortedEvents 
    : sortedEvents.filter(e => e.type === filter);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ministry-text mb-1">Events & Services</h1>
          <p className="text-gray-500">Manage church calendar, track attendance, and view service highlights.</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          {['All', 'Service', 'Event'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filter === f 
                  ? 'bg-ministry-text text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-ministry-card border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-ministry-orange/30 transition-all duration-300 group flex flex-col h-96">
            
            {/* Scrollable Content Area */}
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  event.type === 'Service' 
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

      <EventDetailsModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </div>
  );
};

export default EventsView;