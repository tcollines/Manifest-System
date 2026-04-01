import os

filepath = r"d:\Manifest System\frontend\components\FinanceDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

target_jsx = """                {activeTab === 'fleet' && (
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
                )}"""

replacement_jsx = """                {/* Phase 3: Prop-ified decoupled View */}
                {activeTab === 'fleet' && (
                    <FleetView 
                        events={events}
                        refreshData={refreshData}
                        isRefreshing={isRefreshing}
                        fleetViewMode={fleetViewMode}
                        selectedFleetEvent={selectedFleetEvent}
                        fleetJourneyTab={fleetJourneyTab}
                        setFleetJourneyTab={setFleetJourneyTab}
                        handlePrintFleetReport={handlePrintFleetReport}
                        eventVehicles={eventVehicles}
                        pickupStations={pickupStations}
                        handlePrintBatchAccountability={handlePrintBatchAccountability}
                        getVehicleJourneyStatus={getVehicleJourneyStatus}
                        formatMoney={formatMoney}
                        handleViewVehicle={handleViewVehicle}
                        isServiceClosed={isServiceClosed}
                        isEventLocked={isEventLocked}
                        handleOpenEventFleet={handleOpenEventFleet}
                        setSelectedFleetEvent={setSelectedFleetEvent}
                        handleBackToEvents={handleBackToEvents}
                    />
                )}"""

append_jsx = """
const FleetView = ({
    events,
    refreshData,
    isRefreshing,
    fleetViewMode,
    selectedFleetEvent,
    fleetJourneyTab,
    setFleetJourneyTab,
    handlePrintFleetReport,
    eventVehicles,
    pickupStations,
    handlePrintBatchAccountability,
    getVehicleJourneyStatus,
    formatMoney,
    handleViewVehicle,
    isServiceClosed,
    isEventLocked,
    handleOpenEventFleet,
    setSelectedFleetEvent,
    handleBackToEvents
}: any) => {
    return (
        <div className="space-y-6 animate-in fade-in">
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
                                    {events.filter((e: any) => e.type === 'Event').map((event: any) => {
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
                                                                handlePrintFleetReport(); 
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
                                        {Array.from(new Set(eventVehicles.map((v: any) => v.stationId || 'direct'))).sort().map((stationId: any) => {
                                            const stationVehicles = eventVehicles.filter((v: any) => (v.stationId || 'direct') === stationId);
                                            const stationName = stationId === 'direct' ? 'Direct Event Vehicles' : pickupStations.find((s: any) => s.id === stationId)?.name || 'Unknown Station';

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
                                                        {stationVehicles.map((v: any) => (
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
    );
};
"""

if target_jsx in code:
    code = code.replace(target_jsx, replacement_jsx)
    code = code.replace("export default FinanceDashboard;", append_jsx + "\nexport default FinanceDashboard;")
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(code)
    print("Successfully extracted FleetView!")
else:
    print("Could not find target JSX. Check spaces or formatting.")
