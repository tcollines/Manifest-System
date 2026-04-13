/**
 * FleetTab
 *
 * Fleet logistics view for the Finance module.
 * Two-level navigation: Events grid → Vehicle list within event.
 * Vehicle detail modal is hosted in FinanceLayout.
 * Consumes shared state via useFinance() — no props.
 */

import React from 'react';
import { useFinance } from '../FinanceContext';
import { isEventLocked, isServiceClosed } from '../../../utils';
import {
    Bus, Calendar, ArrowUpRight, ArrowDownLeft, CheckCircle, Printer,
    ArrowLeft, RotateCcw
} from 'lucide-react';

const FleetTab: React.FC = () => {
    const {
        events, isRefreshing, refreshData,
        fleetViewMode, selectedFleetEvent, setSelectedFleetEvent,
        fleetJourneyTab, setFleetJourneyTab,
        pickupStations,
        handleOpenEventFleet, handleBackToEvents,
        handleViewVehicle, handlePrintFleetReport, handlePrintBatchAccountability,
        getEventVehicles, getVehicleJourneyStatus,
        formatMoney,
    } = useFinance();

    const eventVehicles = getEventVehicles();

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            {/* Events Grid View */}
            {fleetViewMode === 'events' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Bus className="w-5 h-5 text-ministry-orange" />
                            <h2 className="text-xl font-bold text-gray-800">Select Operation / Event</h2>
                        </div>
                        <button
                            onClick={() => refreshData()}
                            disabled={isRefreshing}
                            className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-ministry-orange disabled:opacity-50"
                            title="Refresh Data"
                        >
                            <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.filter(e => e.type === 'Event').map(event => {
                            const isLocked = isEventLocked(event.date);
                            return (
                                <div
                                    key={event.id}
                                    onClick={() => handleOpenEventFleet(event)}
                                    className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-lg hover:border-ministry-orange/40 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-gray-100 rounded-full group-hover:bg-ministry-orange group-hover:text-white transition-colors">
                                            {event.type === 'Service' ? <Calendar className="w-6 h-6" /> : <Bus className="w-6 h-6" />}
                                        </div>
                                        <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">{event.date}</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-ministry-orange transition-colors">{event.title}</h4>
                                    <p className="text-sm text-gray-500">{event.type}</p>

                                    {isLocked && (
                                        <div className="mt-4 pt-4 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => { setSelectedFleetEvent(event); handlePrintFleetReport(); }}
                                                className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors"
                                            >
                                                <Printer className="w-4 h-4" /><span>Print Report</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {events.filter(e => e.type === 'Event').length === 0 && (
                            <div className="col-span-3 p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                No events found. Create an event first.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Vehicles View */}
            {fleetViewMode === 'vehicles' && selectedFleetEvent && (
                <div className="space-y-6">
                    {/* Sub-header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                        <div className="flex items-center space-x-3">
                            <button onClick={handleBackToEvents} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedFleetEvent.title}</h3>
                                <p className="text-sm text-gray-500">Fleet Logistics</p>
                            </div>
                            <button
                                onClick={() => refreshData()}
                                disabled={isRefreshing}
                                className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-ministry-orange disabled:opacity-50"
                            >
                                <RotateCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
                            {([
                                { id: 'Ongoing', icon: ArrowUpRight, label: 'Ongoing' },
                                { id: 'Return', icon: ArrowDownLeft, label: 'Return' },
                                { id: 'Cleared', icon: CheckCircle, label: 'Cleared' },
                                { id: 'All', icon: Bus, label: 'All' },
                            ] as const).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFleetJourneyTab(tab.id)}
                                    className={`flex-1 md:flex-none px-5 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1 ${fleetJourneyTab === tab.id ? 'bg-white shadow text-ministry-orange' : 'text-gray-500'}`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                                </button>
                            ))}
                            <button
                                onClick={handlePrintFleetReport}
                                className="px-4 py-2 rounded-md text-sm font-bold text-gray-500 hover:text-gray-900 transition-all flex items-center border-l border-gray-200 ml-1"
                                title="Print Fleet Report"
                            >
                                <Printer className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Vehicle Cards */}
                    {eventVehicles.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white">
                            No vehicles requiring finance attention for this filter.
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Array.from(new Set(eventVehicles.map(v => v.stationId || 'direct'))).sort().map(stationId => {
                                const stationVehicles = eventVehicles.filter(v => (v.stationId || 'direct') === stationId);
                                const stationName = stationId === 'direct'
                                    ? 'Direct Event Vehicles'
                                    : pickupStations.find(s => s.id === stationId)?.name || 'Unknown Station';

                                return (
                                    <div key={stationId} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                        {/* Station Header */}
                                        <div className="bg-white px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                                                <div className="w-2 h-8 bg-ministry-orange rounded-full" />
                                                {stationName}
                                                <span className="text-sm font-normal text-gray-400">({stationVehicles.length} vehicles)</span>
                                            </h4>
                                            <button
                                                onClick={() => handlePrintBatchAccountability(stationVehicles)}
                                                className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors shadow-sm"
                                            >
                                                <Printer className="w-4 h-4" /><span>Print Station Batch</span>
                                            </button>
                                        </div>

                                        {/* Vehicle Cards Grid */}
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {stationVehicles.map(v => {
                                                const journeyStatus = getVehicleJourneyStatus(v);
                                                const isLocked = (selectedFleetEvent.type === 'Service' && isServiceClosed(selectedFleetEvent.date))
                                                    || (selectedFleetEvent.type === 'Event' && isEventLocked(selectedFleetEvent.date));

                                                return (
                                                    <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-lg font-bold font-mono text-gray-900">{v.number_plate}</h4>
                                                            {fleetJourneyTab === 'All' && (
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${(!v.approvals || v.approvals.registration === 'Approved') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    {(!v.approvals || v.approvals.registration === 'Approved') ? 'Active' : 'Pending'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500 mb-1">{v.type} • {v.driverName}</p>
                                                        <p className="text-xs text-gray-400">{v.coordinator || 'No Coordinator'}</p>

                                                        {journeyStatus === 'Cleared' ? (
                                                            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                                                                <p className="text-xs text-green-700 font-bold uppercase mb-1">Total Paid</p>
                                                                <p className="text-lg font-black text-green-800">
                                                                    {formatMoney(parseFloat(v.financeDetails?.ongoingBalance || '0') + parseFloat(v.financeDetails?.returnDispatch || '0'))}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleViewVehicle(v)}
                                                                disabled={isLocked}
                                                                className={`w-full mt-4 py-2 rounded-lg text-sm font-bold transition-colors ${isLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-ministry-text text-white hover:bg-ministry-orange'}`}
                                                            >
                                                                {isLocked ? 'View Only' : journeyStatus === 'Ongoing' ? 'Process Ongoing' : 'Process Return'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FleetTab;
