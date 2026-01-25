import React from 'react';
import { MinistryEvent, User } from '../types';
import { VehicleStore } from '../database/vehicleStore';
import { LogisticsStore } from '../database/logisticsStore';
import { UserStore } from '../database/userStore';
import { MemberStore } from '../database/memberStore';
import { SoulsStore } from '../database/soulsStore';
import { FinanceStore } from '../database/financeStore';
import { ParkingStore } from '../database/parkingStore';
import { X, Users, Heart, GraduationCap, DollarSign, Baby, Download, Calendar, MapPin, Bus, Building2, Car } from 'lucide-react';

interface EventDetailsModalProps {
  event: MinistryEvent | null;
  onClose: () => void;
}

const StatCard: React.FC<{ label: string; value: string | number; icon: React.FC<any>; colorClass: string }> = ({ label, value, icon: Icon, colorClass }) => (
  <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-20`}>
      <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose }) => {
  const [stats, setStats] = React.useState({
    vehicles: 0,
    personalCars: 0,
    students: 0,
    institutions: 0,
    attendees: 0,
    firstTimers: 0,
    soulsWon: 0,
    children: 0,
    expenditure: '0'
  });

  React.useEffect(() => {
    if (!event) return;

    const calculateStats = async () => {
      try {
        const allVehicles = await VehicleStore.getVehicles();
        const allStations = await LogisticsStore.getStations();
        const allPassengers = await VehicleStore.getPassengers();
        const allTransactions = await FinanceStore.getTransactions();
        const allPersonalCars = await ParkingStore.getAll();

        // 1. Logistics Stats
        const eventStations = allStations.filter(s => s.eventId === event.id);
        const eventStationIds = eventStations.map(s => s.id);
        const eventVehicles = allVehicles.filter(v => eventStationIds.includes(v.stationId));
        const eventPassengers = allPassengers.filter(p => eventVehicles.some(v => v.id === p.vehicleId));

        const logisticsFirstTimers = eventPassengers.filter(p => p.isFirstTime === 'Yes').length;
        const logisticsChildren = eventVehicles.reduce((sum, v) => sum + (v.childrenCount || 0), 0);
        const logisticsAttendees = eventPassengers.length + logisticsChildren;
        const soulsWonCount = eventPassengers.filter(p => p.soulWon).length;

        // Fleet Expenditure
        const fleetExpenditure = eventVehicles.reduce((sum, v) => {
          const dispatchAmount = parseFloat(v.financeDetails?.ongoingDispatch || '0');
          return sum + dispatchAmount;
        }, 0);

        // Finance Transactions Expenditure
        const financeExpenditure = allTransactions
          .filter(t => String(t.eventId) === String(event.id) && t.type === 'Expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenditure = fleetExpenditure + financeExpenditure;

        // Personal Cars Stats
        // Fetch from the source of truth (Table or Array Fallback)
        const eventPersonalCars = await ParkingStore.getAttendanceCount(event.id);

        // 2. Service Stats (General Check-in)
        let totalAttendees = logisticsAttendees;
        let firstTimersCount = logisticsFirstTimers;

        if (event.type === 'Service') {
          const serviceStats = await MemberStore.getServiceStats(event.id, event.date);
          totalAttendees = Math.max(logisticsAttendees, serviceStats.total);
          firstTimersCount = Math.max(logisticsFirstTimers, serviceStats.firstTimers);
        }

        setStats({
          vehicles: eventVehicles.length,
          personalCars: eventPersonalCars,
          students: eventPassengers.filter(p => p.category === 'Student').length,
          institutions: eventPassengers.filter(p => p.category === 'Institution').length,
          attendees: totalAttendees,
          firstTimers: firstTimersCount,
          soulsWon: soulsWonCount,
          children: logisticsChildren,
          expenditure: totalExpenditure.toLocaleString()
        });

      } catch (error) {
        console.error("Error calculating event stats:", error);
      }
    };

    calculateStats();
  }, [event]);

  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-ministry-card p-6 border-b border-gray-200 flex justify-between items-start shrink-0">
          <div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${event.type === 'Service'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
              }`}>
              {event.type} Highlights
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {event.date} • {event.time}</span>
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {event.location}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Performance Metrics</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Attendees" value={stats.attendees} icon={Users} colorClass="bg-blue-500" />
            <StatCard label="First Timers" value={stats.firstTimers} icon={Users} colorClass="bg-green-500" />
            <StatCard label="Souls Won" value={stats.soulsWon || event.stats.soulsWon || 0} icon={Heart} colorClass="bg-red-500" />

            {/* Dynamic Stats */}
            <StatCard label="Fleet Vehicles" value={stats.vehicles} icon={Bus} colorClass="bg-yellow-500" />
            <StatCard label="Personal Cars" value={stats.personalCars} icon={Car} colorClass="bg-purple-500" />
            <StatCard label="Students" value={stats.students} icon={GraduationCap} colorClass="bg-indigo-500" />
            <StatCard label="Institutions" value={stats.institutions} icon={Building2} colorClass="bg-cyan-500" />

            {/* Additional Dynamic Stats */}
            <StatCard label="Children" value={stats.children} icon={Baby} colorClass="bg-pink-500" />
            <StatCard label="Expenditure" value={`UGX ${stats.expenditure}`} icon={DollarSign} colorClass="bg-gray-600" />

            {event.type === 'Service' && event.stats.nextGen !== undefined && (
              <StatCard label="Next Gen" value={event.stats.nextGen} icon={Baby} colorClass="bg-orange-500" />
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
            <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                        <html>
                            <head>
                                <title>${event.title} - Highlights</title>
                                <style>
                                    body { font-family: sans-serif; padding: 40px; }
                                    .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                                    .title { font-size: 24px; font-weight: bold; color: #111; margin: 0; }
                                    .meta { color: #666; font-size: 14px; margin-top: 5px; }
                                    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                                    .card { padding: 20px; border: 1px solid #ddd; border-radius: 12px; background: #fafafa; }
                                    .label { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 5px; }
                                    .value { font-size: 24px; font-weight: bold; color: #000; }
                                    .desc-box { background: #f9f9f9; padding: 20px; border-radius: 8px; font-size: 14px; color: #444; line-height: 1.6; }
                                </style>
                            </head>
                            <body>
                                <div class="header">
                                    <h1 class="title">${event.title}</h1>
                                    <div class="meta">${event.date} • ${event.time} | ${event.location}</div>
                                </div>
                                <div class="grid">
                                    <div class="card"><div class="label">Total Attendees</div><div class="value">${stats.attendees}</div></div>
                                    <div class="card"><div class="label">First Timers</div><div class="value">${stats.firstTimers}</div></div>
                                    <div class="card"><div class="label">Souls Won</div><div class="value">${stats.soulsWon || event.stats?.soulsWon || 0}</div></div>
                                    <div class="card"><div class="label">Fleet Vehicles</div><div class="value">${stats.vehicles}</div></div>
                                    <div class="card"><div class="label">Personal Cars</div><div class="value">${stats.personalCars}</div></div>
                                    <div class="card"><div class="label">Students</div><div class="value">${stats.students}</div></div>
                                    <div class="card"><div class="label">Institutions</div><div class="value">${stats.institutions}</div></div>
                                    <div class="card"><div class="label">Children</div><div class="value">${stats.children}</div></div>
                                    <div class="card"><div class="label">Expenditure</div><div class="value">UGX ${stats.expenditure}</div></div>
                                </div>
                                <h3>Description</h3>
                                <div class="desc-box">${event.description || 'No description provided.'}</div>
                                <script>
                                    window.print();
                                    setTimeout(() => window.close(), 500);
                                </script>
                            </body>
                        </html>
                    `);
                printWindow.document.close();
              }
            }}
            className="flex items-center space-x-2 bg-ministry-text text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5" />
            <span>Download Highlights</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;