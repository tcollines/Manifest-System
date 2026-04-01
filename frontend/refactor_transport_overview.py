import os
import re

filepath = r"d:\Manifest System\frontend\components\TransportationDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

# We'll use split to isolate the block between "OVERVIEW TAB" and "COORDINATORS TAB" to avoid massive literal string comparisons.
delimiter_start = "            {/* === OVERVIEW TAB === */}"
delimiter_end = "            {/* === COORDINATORS TAB === */}"

if delimiter_start in code and delimiter_end in code:
    parts_before = code.split(delimiter_start)
    parts_after = parts_before[1].split(delimiter_end)
    
    target_jsx_block = parts_after[0] # This is everything from OVERVIEW TAB up to COORDINATORS TAB
    
    # We want to replace the `activeTab === 'overview' && (` block with `<OverviewTab {...props} />`
    
    props_list ="""                    <OverviewTab
                        adminViewMode={adminViewMode}
                        selectedAdminVehicle={selectedAdminVehicle}
                        handleBackToFleet={handleBackToFleet}
                        adminVehiclePassengers={adminVehiclePassengers}
                        adminDetailTab={adminDetailTab}
                        setAdminDetailTab={setAdminDetailTab}
                        renderJourneyReport={renderJourneyReport}
                        totalPeopleCount={totalPeopleCount}
                        totalVehicles={totalVehicles}
                        inTransit={inTransit}
                        delayed={delayed}
                        vehicles={vehicles}
                        isLoaded={isLoaded}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        center={center}
                        mapContainerStyle={mapContainerStyle}
                        activeVehicles={activeVehicles}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        isAssigning={isAssigning}
                        setIsAssigning={setIsAssigning}
                        selectedCoordinator={selectedCoordinator}
                        setSelectedCoordinator={setSelectedCoordinator}
                        coordinators={coordinators}
                        handleAssignCoordinator={handleAssignCoordinator}
                        isEventLocked={isEventLocked}
                        selectedEvent={selectedEvent}
                        handleOpenAdminVehicle={handleOpenAdminVehicle}
                    />"""

    replacement_block = f"""\n{props_list}\n"""

    # We also need to define OverviewTab at the bottom of the file
    overview_tab_def = f"""
const OverviewTab = ({{
    adminViewMode,
    selectedAdminVehicle,
    handleBackToFleet,
    adminVehiclePassengers,
    adminDetailTab,
    setAdminDetailTab,
    renderJourneyReport,
    totalPeopleCount,
    totalVehicles,
    inTransit,
    delayed,
    vehicles,
    isLoaded,
    onLoad,
    onUnmount,
    center,
    mapContainerStyle,
    activeVehicles,
    filterStatus,
    setFilterStatus,
    isAssigning,
    setIsAssigning,
    selectedCoordinator,
    setSelectedCoordinator,
    coordinators,
    handleAssignCoordinator,
    isEventLocked,
    selectedEvent,
    handleOpenAdminVehicle
}}: any) => {{
    return (
        <>
{target_jsx_block.replace("activeTab === 'overview' && (\\n                <>", "", 1).rsplit("</>\\n            )", 1)[0]}
        </>
    );
}};
"""

    
    # Now we put it all together. But wait! The block starts with `{activeTab === 'overview' && (`
    # so target_jsx_block is:
    # \n            {activeTab === 'overview' && (\n                <>\n ... </>\n            )}\n\n
    
    # A safer replacement approach for the rendering tree:
    new_jsx = f"""            {{/* === OVERVIEW TAB === */}}
            {{activeTab === 'overview' && (
{props_list}
            )}}

            {{/* === COORDINATORS TAB === */}}"""

    final_code = code.replace(delimiter_start + target_jsx_block + delimiter_end, new_jsx)
    final_code = final_code.replace("export default TransportationDashboard;", overview_tab_def + "\nexport default TransportationDashboard;")
    
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(final_code)
    print("Successfully extracted OverviewTab!")
else:
    print("Could not find delimiters.")
